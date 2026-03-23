import { Injectable } from '@angular/core';
import { RxStomp, RxStompConfig } from '@stomp/rx-stomp';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import SockJS from 'sockjs-client';
import { environment } from '../../../environments/environment';
import { Equipment } from '../models/equipment.model';

@Injectable({ providedIn: 'root' })
export class WebsocketService {
  private rxStomp = new RxStomp();

  connect(): void {
    const config: RxStompConfig = {
      webSocketFactory: () => new SockJS(environment.wsUrl) as unknown as WebSocket,
      reconnectDelay: 5000,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
    };
    this.rxStomp.configure(config);
    this.rxStomp.activate();
  }

  get machineUpdates$(): Observable<Equipment[]> {
    return this.rxStomp.watch('/topic/machines').pipe(
      map((msg) => JSON.parse(msg.body) as Equipment[])
    );
  }

  disconnect(): void {
    this.rxStomp.deactivate();
  }
}
