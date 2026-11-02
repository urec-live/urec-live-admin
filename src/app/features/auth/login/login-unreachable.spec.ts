import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { MatSnackBar } from '@angular/material/snack-bar';
import { throwError } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { LoginComponent } from './login.component';

describe('LoginComponent when the server can\'t be reached', () => {
  let auth: jasmine.SpyObj<AuthService>;
  let snackBar: jasmine.SpyObj<MatSnackBar>;

  beforeEach(async () => {
    auth = jasmine.createSpyObj<AuthService>('AuthService', ['login', 'hasAdminRole', 'logout']);
    snackBar = jasmine.createSpyObj<MatSnackBar>('MatSnackBar', ['open']);
    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [provideRouter([]), provideNoopAnimations(), { provide: AuthService, useValue: auth }],
    })
      // MatSnackBarModule provides its own MatSnackBar
      .overrideProvider(MatSnackBar, { useValue: snackBar })
      .compileComponents();
  });

  function signIn(status: number) {
    auth.login.and.returnValue(throwError(() => new HttpErrorResponse({ status })));
    const fixture = TestBed.createComponent(LoginComponent);
    fixture.componentInstance.loginForm.setValue({ username: 'admin', password: 'secret' });
    fixture.componentInstance.onSubmit();
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  it('says UREC Live can\'t be reached when there is no answer', () => {
    const login = signIn(0);

    expect(snackBar.open).toHaveBeenCalledOnceWith(
      "Can't reach UREC Live right now. Check your internet connection, then try again.",
      'Dismiss',
      { duration: 4000 },
    );
    expect(login.errorMessage).toBe('');
  });

  [502, 503, 504].forEach((status) => {
    it(`says the server isn't responding for a ${status}, instead of "an unexpected error"`, () => {
      signIn(status);

      expect(snackBar.open).toHaveBeenCalledOnceWith(
        "UREC Live isn't responding right now. Try again in a minute.",
        'Dismiss',
        { duration: 4000 },
      );
    });
  });

  it('still says the credentials are wrong when the server answers that', () => {
    const login = signIn(401);

    expect(login.errorMessage).toBe('Incorrect username or password. Please try again.');
    expect(snackBar.open).not.toHaveBeenCalled();
  });

  it('still calls a 500 an unexpected error', () => {
    signIn(500);

    expect(snackBar.open).toHaveBeenCalledOnceWith(
      'An unexpected error occurred. Please try again later.',
      'Dismiss',
      { duration: 4000 },
    );
  });
});
