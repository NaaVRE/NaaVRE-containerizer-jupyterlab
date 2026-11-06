// normalizeBaseImage doesn't use start-build's other dependencies, which are
// ES modules that jest can't load.
jest.mock('@jupyterlab/apputils', () => ({}));
jest.mock('../services/catalogue', () => ({}));
jest.mock('../services/containerizer', () => ({}));

import { normalizeBaseImage } from '../components/cell-creation/start-build';

describe('normalizeBaseImage', () => {
  it('accepts two-stage flavor images and drops extra keys', () => {
    expect(
      normalizeBaseImage({ build: 'b:1', runtime: 'r:1', extra: 'x' })
    ).toEqual({ build: 'b:1', runtime: 'r:1' });
  });

  it('accepts binder environment images and drops extra keys', () => {
    expect(
      normalizeBaseImage({ binder_environment: 'img:1', extra: 'x' })
    ).toEqual({ binder_environment: 'img:1' });
  });

  it('ignores empty keys of the other shape', () => {
    expect(
      normalizeBaseImage({ build: '', runtime: '', binder_environment: 'i:1' })
    ).toEqual({ binder_environment: 'i:1' });
    expect(
      normalizeBaseImage({
        build: 'b:1',
        runtime: 'r:1',
        binder_environment: ''
      })
    ).toEqual({ build: 'b:1', runtime: 'r:1' });
  });

  it.each([
    null,
    undefined,
    'img:1',
    {},
    { build: 'b:1' },
    { build: 'b:1', runtime: '' },
    { binder_environment: '' },
    { build: 'b:1', runtime: 'r:1', binder_environment: 'img:1' },
    { build: 'b:1', binder_environment: 'img:1' },
    { runtime: 'r:1', binder_environment: 'img:1' }
  ])('rejects %p', image => {
    expect(() => normalizeBaseImage(image)).toThrow();
  });
});
