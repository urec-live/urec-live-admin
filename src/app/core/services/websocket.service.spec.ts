import { TestBed } from '@angular/core/testing';
import { RxStomp } from '@stomp/rx-stomp';
import { AuthService } from './auth.service';
import { WebsocketService } from './websocket.service';

describe('WebsocketService authentication', () => {
  it('reads the current admin token for every connection', async () => {
    let token: string | null = 'first-token';
    TestBed.configureTestingModule({ providers: [
      WebsocketService,
      { provide: AuthService, useValue: { getAccessToken: () => token } }
    ] });
    const service = TestBed.inject(WebsocketService);
    const stomp = (service as unknown as { rxStomp: RxStomp }).rxStomp;
    const configure = spyOn(stomp, 'configure');
    spyOn(stomp, 'activate');
    service.connect();
    const beforeConnect = configure.calls.first().args[0].beforeConnect!;
    await beforeConnect(stomp);
    expect(configure.calls.mostRecent().args[0].connectHeaders).toEqual({ Authorization: 'Bearer first-token' });
    token = 'refreshed-token';
    await beforeConnect(stomp);
    expect(configure.calls.mostRecent().args[0].connectHeaders).toEqual({ Authorization: 'Bearer refreshed-token' });
    token = null;
    await beforeConnect(stomp);
    expect(configure.calls.mostRecent().args[0].connectHeaders).toEqual({});
  });
});
