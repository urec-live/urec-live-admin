import { Component, inject, OnInit, signal } from '@angular/core';
import {
  MAT_DIALOG_DATA,
  MatDialogRef,
  MatDialogModule,
} from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Equipment } from '../../../core/models/equipment.model';
import QRCode from 'qrcode';

export interface QrDialogData {
  equipment: Equipment;
}

@Component({
  selector: 'app-qr-dialog',
  standalone: true,
  imports: [
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <h2 mat-dialog-title class="flex items-center gap-2">
      <mat-icon class="text-indigo-600">qr_code</mat-icon>
      {{ data.equipment.name }}
    </h2>
    <mat-dialog-content class="flex flex-col items-center gap-3 py-4">
      @if (qrDataUrl()) {
        <img
          [src]="qrDataUrl()!"
          alt="QR Code"
          class="w-[240px] h-[240px] border border-gray-200 rounded-lg"
        />
        <p class="text-sm text-gray-500 font-mono">{{ data.equipment.code }}</p>
      } @else {
        <div class="flex justify-center py-10">
          <mat-spinner diameter="48" />
        </div>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="dialogRef.close()">Close</button>
      @if (qrDataUrl()) {
        <button mat-stroked-button (click)="download()">
          <mat-icon>download</mat-icon> Download
        </button>
        <button mat-flat-button color="primary" (click)="print()">
          <mat-icon>print</mat-icon> Print
        </button>
      }
    </mat-dialog-actions>
  `,
})
export class QrDialogComponent implements OnInit {
  readonly dialogRef = inject(MatDialogRef<QrDialogComponent>);
  readonly data = inject<QrDialogData>(MAT_DIALOG_DATA);

  qrDataUrl = signal<string | null>(null);

  async ngOnInit(): Promise<void> {
    const url = await QRCode.toDataURL(this.data.equipment.code, {
      width: 480,
      margin: 2,
      color: { dark: '#1e1b4b', light: '#ffffff' },
    });
    this.qrDataUrl.set(url);
  }

  download(): void {
    const url = this.qrDataUrl();
    if (!url) return;
    const a = document.createElement('a');
    a.href = url;
    a.download = `${this.data.equipment.code}-qr.png`;
    a.click();
  }

  print(): void {
    const url = this.qrDataUrl();
    if (!url) return;
    const win = window.open('');
    if (!win) return;
    win.document.write(`
      <html><body style="display:flex;justify-content:center;align-items:center;flex-direction:column;font-family:sans-serif;padding:30px">
        <h3 style="margin-bottom:12px">${this.data.equipment.name}</h3>
        <img src="${url}" style="width:280px;height:280px">
        <p style="font-family:monospace;font-size:13px;color:#555;margin-top:8px">${this.data.equipment.code}</p>
      </body></html>
    `);
    win.document.close();
    win.print();
  }
}
