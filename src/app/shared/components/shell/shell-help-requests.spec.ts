import { TestBed } from '@angular/core/testing';
import { WritableSignal, signal } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { HelpRequestStore } from '../../../core/services/help-request-store.service';
import { ShellComponent } from './shell.component';

describe('ShellComponent help requests', () => {
  let store: jasmine.SpyObj<HelpRequestStore>;
  let needsStaffCount: WritableSignal<number>;

  beforeEach(async () => {
    needsStaffCount = signal(0);
    store = jasmine.createSpyObj<HelpRequestStore>('HelpRequestStore', ['start', 'stop'], { needsStaffCount });

    await TestBed.configureTestingModule({
      imports: [ShellComponent],
      providers: [
        provideNoopAnimations(),
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: HelpRequestStore, useValue: store },
      ],
    }).compileComponents();
  });

  it('watches for help requests while signed in, and stops on sign-out', () => {
    const fixture = TestBed.createComponent(ShellComponent);
    fixture.detectChanges();
    expect(store.start).toHaveBeenCalledTimes(1);
    expect(store.stop).not.toHaveBeenCalled();

    fixture.destroy();
    expect(store.stop).toHaveBeenCalledTimes(1);
  });

  it('badges the sidebar with the members waiting for staff', () => {
    const fixture = TestBed.createComponent(ShellComponent);
    fixture.detectChanges();
    const badge = () => (fixture.nativeElement as HTMLElement).querySelector('[data-testid="help-badge"]');
    expect(badge()).toBeNull();

    needsStaffCount.set(2);
    fixture.detectChanges();

    expect(badge()?.textContent?.trim()).toBe('2');
  });
});
