import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { SidebarComponent } from './sidebar.component';

describe('SidebarComponent chat reports badge', () => {
  let fixture: ComponentFixture<SidebarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SidebarComponent],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    fixture = TestBed.createComponent(SidebarComponent);
  });

  function render(chatReportsBadge?: number): void {
    if (chatReportsBadge !== undefined) fixture.componentRef.setInput('chatReportsBadge', chatReportsBadge);
    fixture.detectChanges();
  }

  const el = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const badge = () => el().querySelector<HTMLElement>('[data-testid="chat-reports-badge"]');

  it('links to Chat Reports right after Equipment Issues', () => {
    render();

    const labels = Array.from(el().querySelectorAll('a [matListItemTitle]')).map((t) => t.textContent?.trim());
    expect(labels.indexOf('Chat Reports')).toBe(labels.indexOf('Equipment Issues') + 1);
    const link = Array.from(el().querySelectorAll('a')).find((a) => a.textContent?.includes('Chat Reports'));
    expect(link?.getAttribute('href')).toBe('/chat-reports');
  });

  it('shows no badge when nothing is waiting', () => {
    render(0);
    expect(badge()).toBeNull();
  });

  it('badges the messages awaiting review', () => {
    render(1);
    expect(badge()?.textContent?.trim()).toBe('1');
    expect(badge()?.getAttribute('aria-label')).toBe('1 reported message awaiting review');

    render(3);
    expect(badge()?.getAttribute('aria-label')).toBe('3 reported messages awaiting review');
  });
});
