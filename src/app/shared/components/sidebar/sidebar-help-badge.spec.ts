import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { SidebarComponent } from './sidebar.component';

describe('SidebarComponent help badge', () => {
  let fixture: ComponentFixture<SidebarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SidebarComponent],
      // HttpClient isn't used by the badge, but keeps this spec working once the sidebar loads other badges
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    fixture = TestBed.createComponent(SidebarComponent);
  });

  function render(helpBadge?: number): void {
    if (helpBadge !== undefined) fixture.componentRef.setInput('helpBadge', helpBadge);
    fixture.detectChanges();
  }

  const el = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const badge = () => el().querySelector<HTMLElement>('[data-testid="help-badge"]');
  // The title span, since each link's text also includes its icon's ligature name
  const navLabels = () =>
    Array.from(el().querySelectorAll('a [matListItemTitle]')).map((title) => title.textContent?.trim());

  it('links to Help Requests right after Dashboard', () => {
    render();

    const labels = navLabels();
    expect(labels.indexOf('Dashboard')).toBeGreaterThanOrEqual(0);
    expect(labels.indexOf('Help Requests')).toBe(labels.indexOf('Dashboard') + 1);
    const link = Array.from(el().querySelectorAll('a')).find((a) => a.textContent?.includes('Help Requests'));
    expect(link?.getAttribute('href')).toBe('/help-requests');
  });

  it('shows no badge when nobody is waiting', () => {
    render(0);

    expect(badge()).toBeNull();
  });

  it('shows how many members are waiting for staff', () => {
    render(3);

    expect(badge()?.textContent?.trim()).toBe('3');
    expect(badge()?.getAttribute('aria-label')).toBe('3 members need staff');
    // Only on the Help Requests link
    expect(badge()?.closest('a')?.textContent).toContain('Help Requests');
    expect(el().querySelectorAll('[data-testid="help-badge"]').length).toBe(1);
  });

  it('uses the singular for one member', () => {
    render(1);

    expect(badge()?.getAttribute('aria-label')).toBe('1 member needs staff');
  });

  it('follows the count as it changes', () => {
    render(2);
    render(0);

    expect(badge()).toBeNull();
  });
});
