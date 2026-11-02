import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { BackendUnreachableNoticeComponent } from './shared/components/backend-notice/backend-unreachable-notice.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, BackendUnreachableNoticeComponent],
  template: `<app-backend-unreachable-notice /><router-outlet />`
})
export class AppComponent {}
