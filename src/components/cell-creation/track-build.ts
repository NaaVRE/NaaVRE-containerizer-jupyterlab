import { isEqual } from 'lodash';
import { IVREPanelSettings } from '../../VREPanel';
import { callStatusAPI } from '../../services/containerizer';
import { Notification } from '@jupyterlab/apputils';
import pRetry, { AbortError } from 'p-retry';
import { ICatalogCell, patchCellInCatalogue } from '../../services/catalogue';
import { NaaVRECatalogue } from '../../naavre-common/types';

type ICatalogCellWithContainerizationAttrs = ICatalogCell & {
  containerization_workflow_id: string;
  containerization_job: NaaVRECatalogue.WorkflowCells.IContainerizationJob;
};

class JobNotFoundError extends Error {
  constructor() {
    super('job not found');
  }
}

class JobNotCompletedError extends Error {
  constructor() {
    super('job not completed');
  }
}

class CatalogueUpdateError extends Error {
  constructor() {
    super('failed to update status in the catalogue');
  }
}

export async function updateCellContainerizationJobStatus(
  cell: ICatalogCell,
  containerizationJob: NaaVRECatalogue.WorkflowCells.IContainerizationJob
): Promise<ICatalogCellWithContainerizationAttrs> {
  try {
    return (await patchCellInCatalogue(cell, {
      containerization_job: containerizationJob
    })) as ICatalogCellWithContainerizationAttrs;
  } catch (error) {
    console.error(error);
    throw new CatalogueUpdateError();
  }
}

async function waitForJobCompletion(
  cell: ICatalogCellWithContainerizationAttrs,
  settings: IVREPanelSettings,
  notificationId: string
) {
  Notification.update({
    id: notificationId,
    message: `Containerizing ${cell.title}: starting build job`
  });
  let catalogCell = cell;
  try {
    await pRetry(
      async () => {
        const res = await callStatusAPI(
          cell.containerization_workflow_id,
          settings
        );
        // No job returned: do nothing and retry
        if (res === null) {
          throw new JobNotFoundError();
        }

        // A job returned: update status of notification and in catalog
        console.debug(res.job);
        Notification.update({
          id: notificationId,
          message: `Containerizing ${cell.title}: building image (this can take up to several minutes)`,
          actions: [
            {
              label: 'See progress on GitHub',
              callback: event => {
                event.preventDefault();
                window.open(res.job.html_url);
              }
            }
          ]
        });

        if (!isEqual(res.job, catalogCell.containerization_job)) {
          catalogCell = await updateCellContainerizationJobStatus(
            catalogCell,
            res.job
          );
        }
        // The job is still running: do nothing and retry
        if (res.job.status !== 'completed') {
          throw new JobNotCompletedError();
        }

        // The job is completed
        if (res.job.conclusion !== 'success') {
          throw new AbortError('job was not successful');
        }
        return res;
      },
      {
        retries: 180,
        factor: 1,
        minTimeout: 20000,
        shouldRetry: ({ error, attemptNumber }) =>
          !(error instanceof JobNotFoundError && attemptNumber >= 5)
      }
    );
  } catch (error) {
    if (error instanceof JobNotFoundError) {
      Notification.update({
        id: notificationId,
        type: 'error',
        message: `Failed to containerize ${cell.title}: job not found`,
        autoClose: 5000
      });
      await updateCellContainerizationJobStatus(cell, {
        ...cell.containerization_job,
        status: 'completed',
        conclusion: 'failure'
      });
    } else if (error instanceof JobNotCompletedError) {
      Notification.update({
        id: notificationId,
        type: 'warning',
        message: `Gave up waiting for containerization of ${cell.title} `,
        actions: [
          {
            label: 'See status on GitHub',
            callback: event => {
              event.preventDefault();
              window.open(catalogCell.containerization_job.html_url);
            }
          }
        ],
        autoClose: 5000
      });
    } else if (error instanceof CatalogueUpdateError) {
      Notification.update({
        id: notificationId,
        type: 'error',
        message: `Failed to containerize ${cell.title}: catalogue update failed`,
        actions: [],
        autoClose: 5000
      });
    } else {
      console.error('Unhandled error', error);
      Notification.update({
        id: notificationId,
        type: 'error',
        message: `Failed to containerize ${cell.title}: ${error}`,
        actions: [
          {
            label: 'See status on GitHub',
            callback: event => {
              event.preventDefault();
              window.open(catalogCell.containerization_job.html_url);
            }
          }
        ],
        autoClose: 5000
      });
      await updateCellContainerizationJobStatus(cell, {
        ...cell.containerization_job,
        status: 'completed',
        conclusion: 'failure'
      });
    }
    return;
  }

  Notification.update({
    id: notificationId,
    type: 'success',
    message: `Containerized ${cell.title}`,
    actions: [],
    autoClose: 5000
  });
}

export async function trackBuild(
  cell: ICatalogCell,
  settings: IVREPanelSettings,
  existingNotificationId: string | null
) {
  let notificationId: string;
  if (existingNotificationId === null) {
    notificationId = Notification.emit(
      `Containerizing ${cell.title}`,
      'in-progress',
      { autoClose: false }
    );
  } else {
    notificationId = existingNotificationId;
  }

  if (
    cell.containerization_workflow_id === null ||
    cell.containerization_workflow_id === undefined
  ) {
    Notification.update({
      id: notificationId,
      type: 'warning',
      message: `Cannot track containerization of ${cell.title}: no workflow id found`,
      autoClose: 5000
    });
    return;
  }
  if (
    cell.containerization_job === null ||
    cell.containerization_job === undefined
  ) {
    Notification.update({
      id: notificationId,
      type: 'warning',
      message: `Cannot track containerization of ${cell.title}: no job info found`,
      autoClose: 5000
    });
    return;
  }

  await waitForJobCompletion(
    cell as ICatalogCellWithContainerizationAttrs,
    settings,
    notificationId
  );
}
