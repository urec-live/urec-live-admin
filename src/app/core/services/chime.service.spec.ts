import { TestBed } from '@angular/core/testing';
import { AUDIO_CONTEXT_FACTORY, CHIME_MUTED_KEY, ChimeService } from './chime.service';

/** Just enough of the Web Audio API to see which notes were scheduled. */
class FakeAudioContext {
  state: AudioContextState = 'running';
  currentTime = 10;
  destination = {};
  readonly notes: number[] = [];
  resume = jasmine.createSpy('resume').and.callFake(() => {
    this.state = 'running';
    return Promise.resolve();
  });

  createOscillator() {
    const notes = this.notes;
    return {
      type: '',
      frequency: { setValueAtTime: (hz: number) => notes.push(hz) },
      connect: () => {},
      start: () => {},
      stop: () => {},
    };
  }

  createGain() {
    return {
      gain: { setValueAtTime: () => {}, exponentialRampToValueAtTime: () => {} },
      connect: () => {},
    };
  }
}

describe('ChimeService', () => {
  let context: FakeAudioContext | null;
  let factory: jasmine.Spy;

  function create(): ChimeService {
    TestBed.configureTestingModule({
      providers: [{ provide: AUDIO_CONTEXT_FACTORY, useValue: factory }],
    });
    return TestBed.inject(ChimeService);
  }

  beforeEach(() => {
    localStorage.removeItem(CHIME_MUTED_KEY);
    context = new FakeAudioContext();
    factory = jasmine.createSpy('createAudioContext').and.callFake(() => context);
  });

  afterEach(() => localStorage.removeItem(CHIME_MUTED_KEY));

  it('plays a high note then a lower one', () => {
    create().play();

    expect(context!.notes).toEqual([988, 784]);
  });

  it('creates the audio context once, on first use', () => {
    const chime = create();
    expect(factory).not.toHaveBeenCalled();

    chime.play();
    chime.play();

    expect(factory).toHaveBeenCalledTimes(1);
    expect(context!.notes.length).toBe(4);
  });

  it('stays silent while muted, and remembers the setting', () => {
    const chime = create();

    chime.setMuted(true);
    chime.play();

    expect(context!.notes).toEqual([]);
    expect(chime.muted()).toBeTrue();
    expect(localStorage.getItem(CHIME_MUTED_KEY)).toBe('true');
  });

  it('starts muted if it was muted before a reload', () => {
    localStorage.setItem(CHIME_MUTED_KEY, 'true');

    expect(create().muted()).toBeTrue();
  });

  it('can be unmuted again', () => {
    localStorage.setItem(CHIME_MUTED_KEY, 'true');
    const chime = create();

    chime.setMuted(false);
    chime.play();

    expect(localStorage.getItem(CHIME_MUTED_KEY)).toBe('false');
    expect(context!.notes).toEqual([988, 784]);
  });

  it('does nothing where Web Audio is unsupported', () => {
    context = null;
    const chime = create();

    expect(() => chime.play()).not.toThrow();
    expect(() => chime.unlock()).not.toThrow();
  });

  it('does nothing if creating the audio context throws', () => {
    factory.and.throwError('NotAllowedError');
    const chime = create();

    expect(() => chime.play()).not.toThrow();
  });

  it('resumes audio the browser suspended', () => {
    context!.state = 'suspended';

    create().play();

    expect(context!.resume).toHaveBeenCalled();
    expect(context!.notes).toEqual([988, 784]);
  });

  it('unlock() resumes only a suspended context', () => {
    const chime = create();
    chime.unlock();
    expect(context!.resume).not.toHaveBeenCalled();

    context!.state = 'suspended';
    chime.unlock();
    expect(context!.resume).toHaveBeenCalledTimes(1);
  });

  it('unlocks audio on the first click after arming, then stops listening', () => {
    const chime = create();
    context!.state = 'suspended';

    chime.armUnlock();
    document.dispatchEvent(new Event('pointerdown'));
    context!.state = 'suspended';
    document.dispatchEvent(new Event('pointerdown'));

    expect(context!.resume).toHaveBeenCalledTimes(1);
  });

  it('unlocks on a keypress too', () => {
    const chime = create();
    context!.state = 'suspended';

    chime.armUnlock();
    document.dispatchEvent(new Event('keydown'));

    expect(context!.resume).toHaveBeenCalledTimes(1);
  });

  it('can be disarmed before anyone interacts', () => {
    const chime = create();
    context!.state = 'suspended';

    const disarm = chime.armUnlock();
    disarm();
    document.dispatchEvent(new Event('pointerdown'));

    expect(context!.resume).not.toHaveBeenCalled();
  });
});
