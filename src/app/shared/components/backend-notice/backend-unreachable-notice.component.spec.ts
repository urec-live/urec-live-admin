import { ComponentFixture, TestBed, fakeAsync, flush, tick } from '@angular/core/testing';
import { HttpErrorResponse, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, TestRequest, provideHttpClientTesting } from '@angular/common/http/testing';
import { environment } from '../../../../environments/environment';
import { backendStatusInterceptor } from '../../../core/interceptors/backend-status.interceptor';
import { BackendStatusService } from '../../../core/services/backend-status.service';
import { BackendUnreachableNoticeComponent, isQuiet } from './backend-unreachable-notice.component';

const NETWORK_TITLE = "Can't reach UREC Live";
const SERVER_TITLE = "UREC Live isn't responding";
const NETWORK_STEPS =
  'Check your internet connection, then try again. If your connection is fine, the server may be down for a moment. If it keeps happening, reload the page.';
const CHECK_URL = `${environment.apiUrl}/auth/test`;

describe('BackendUnreachableNoticeComponent', () => {
  let fixture: ComponentFixture<BackendUnreachableNoticeComponent>;
  let status: BackendStatusService;
  let backend: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [BackendUnreachableNoticeComponent],
      providers: [provideHttpClient(withInterceptors([backendStatusInterceptor])), provideHttpClientTesting()],
    });
    status = TestBed.inject(BackendStatusService);
    backend = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(BackendUnreachableNoticeComponent);
    fixture.detectChanges();
  });

  const el = () => fixture.nativeElement as HTMLElement;
  const notice = () => el().querySelector<HTMLElement>('[data-testid="backend-notice"]');
  const text = () => notice()?.textContent?.replace(/\s+/g, ' ').trim() ?? '';
  const retry = () => el().querySelector<HTMLButtonElement>('[data-testid="backend-notice-retry"]')!;
  const dismiss = () => el().querySelector<HTMLButtonElement>('[aria-label="Dismiss"]')!;
  const update = () => fixture.detectChanges();
  const fail = (status_ = 0) => {
    status.noteRequestError(new HttpErrorResponse({ status: status_ }));
    update();
  };
  const answer = () => {
    status.noteRequestAnswered();
    update();
  };
  const wait = (ms: number) => {
    tick(ms);
    update();
  };
  const click = (button: HTMLButtonElement) => {
    button.click();
    update();
  };
  /** Ends a fakeAsync test: the component's timers go with it */
  const finish = () => {
    fixture.destroy();
    flush();
  };

  it('shows nothing while requests are answered', () => {
    answer();
    expect(notice()).toBeNull();
  });

  it('tells staff the dashboard can\'t reach the server, and what to try', () => {
    fail();

    expect(text()).toContain(NETWORK_TITLE);
    expect(text()).toContain(NETWORK_STEPS);
    expect(retry().textContent?.trim()).toBe('Try again');
    expect(notice()?.getAttribute('role')).toBe('alert');
  });

  it("says the server isn't responding when the host answers for it", () => {
    fail(503);

    expect(text()).toContain(SERVER_TITLE);
    expect(text()).toContain("the server isn't answering. Try again in a minute");
  });

  it('sits above the page, fixed to the top of the screen', () => {
    fail();
    const style = getComputedStyle(notice()!);
    expect(style.position).toBe('fixed');
    expect(Number(style.zIndex)).toBeGreaterThan(1000); // above Material dialogs' overlay
  });

  it('goes away on its own after 10 seconds, even while requests keep failing', fakeAsync(() => {
    fail();
    wait(5_000);
    fail(); // a poll failing again doesn't keep it up longer

    wait(4_999);
    expect(text()).toContain(NETWORK_TITLE);
    wait(1);
    expect(notice()).toBeNull();
    finish();
  }));

  it('switches wording when the kind of failure changes, without staying up longer', fakeAsync(() => {
    fail();
    wait(5_000);
    fail(502);
    expect(text()).toContain(SERVER_TITLE);
    fail();
    expect(text()).toContain(NETWORK_TITLE);

    wait(5_000);
    expect(notice()).toBeNull();
    finish();
  }));

  it('stays away for 30 seconds after going, then comes back if requests still fail', fakeAsync(() => {
    fail();
    wait(10_000);

    wait(29_000);
    fail();
    expect(notice()).toBeNull();

    wait(1_000);
    fail();
    expect(text()).toContain(NETWORK_TITLE);
    finish();
  }));

  it('can be closed, and then stays away for 30 seconds even if some requests get answers', fakeAsync(() => {
    fail();
    click(dismiss());
    expect(notice()).toBeNull();

    // A patchy connection: answers and failures take turns
    for (let i = 0; i < 6; i++) {
      wait(2_000);
      if (i % 2) fail();
      else answer();
      expect(notice()).toBeNull();
    }
    wait(18_000);
    fail();
    expect(text()).toContain(NETWORK_TITLE);
    finish();
  }));

  it("says Connected again for 3 seconds when requests are answered while it's up", fakeAsync(() => {
    fail();
    answer();

    expect(text()).toContain('Connected again');
    expect(text()).not.toContain(NETWORK_TITLE);
    wait(2_999);
    expect(text()).toContain('Connected again');
    wait(1);
    expect(notice()).toBeNull();
    finish();
  }));

  it("doesn't say Connected again when it wasn't showing", fakeAsync(() => {
    fail();
    wait(10_000);
    answer();

    expect(notice()).toBeNull();
    finish();
  }));

  it("drops Connected again if requests fail again, and doesn't flip back to the warning", fakeAsync(() => {
    fail();
    answer();
    wait(1_000);

    fail();
    expect(notice()).toBeNull();
    answer();
    fail();
    expect(notice()).toBeNull();

    // A real outage still shows once 30 s have passed since the warning went
    wait(30_000);
    fail();
    expect(text()).toContain(NETWORK_TITLE);
    finish();
  }));

  describe('Try again', () => {
    let check: TestRequest;
    const startCheck = () => {
      click(retry());
      check = backend.expectOne(CHECK_URL);
    };

    it('asks the server, and says Connected again when it answers', fakeAsync(() => {
      fail();
      startCheck();
      expect(retry().disabled).toBeTrue();
      expect(retry().textContent?.trim()).toBe('Checking…');
      click(retry()); // a second click sends nothing
      backend.expectNone(CHECK_URL);

      check.flush('Auth endpoint is working!');
      update();

      expect(text()).toContain('Connected again');
      finish();
    }));

    it('keeps the warning up while it checks', fakeAsync(() => {
      fail();
      wait(8_000);
      startCheck();

      wait(9_000); // past the warning's own 10 s
      expect(retry().textContent?.trim()).toBe('Checking…');

      check.flush('ok');
      update();
      expect(text()).toContain('Connected again');
      finish();
    }));

    it('says so when it still fails, and keeps the warning up another 10 seconds', fakeAsync(() => {
      fail();
      wait(8_000);
      startCheck();
      check.error(new ProgressEvent('error'));
      update();

      expect(text()).toContain("Still can't reach UREC Live");
      expect(retry().disabled).toBeFalse();
      wait(9_999);
      expect(text()).toContain("Still can't reach UREC Live");
      wait(1);
      expect(notice()).toBeNull();
      finish();
    }));

    it('gives up after 10 seconds without an answer', fakeAsync(() => {
      fail();
      startCheck();

      wait(10_000);

      expect(check.cancelled).toBeTrue();
      expect(text()).toContain("Still can't reach UREC Live");
      finish();
    }));

    it('counts an error answer as connected', fakeAsync(() => {
      fail();
      startCheck();
      check.flush('', { status: 500, statusText: 'Server Error' });
      update();

      expect(text()).toContain('Connected again');
      finish();
    }));

    it('stops when the warning is closed, so its result can\'t bring it back', fakeAsync(() => {
      fail();
      startCheck();

      click(dismiss());

      expect(check.cancelled).toBeTrue();
      expect(notice()).toBeNull();
      finish();
    }));
  });

  it('ends the quiet time, rather than stretching it, when the clock has been set back', () => {
    expect(isQuiet(10_000, 5_000)).toBeTrue();
    expect(isQuiet(40_000, 5_000)).toBeFalse();
    expect(isQuiet(1_000, 5_000)).toBeFalse(); // stamped before the quiet time began
    expect(isQuiet(1_000, null)).toBeFalse();
  });
});
