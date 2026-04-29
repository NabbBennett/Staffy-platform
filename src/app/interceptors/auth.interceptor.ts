import { Injectable } from '@angular/core';
import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  intercept(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    if (typeof localStorage === 'undefined') {
      return next.handle(req);
    }

    const userId = localStorage.getItem('staffy_user_id');
    if (!userId) {
      return next.handle(req);
    }

    const clonedRequest = req.clone({
      headers: req.headers.set('x-staffy-user-id', userId)
    });

    return next.handle(clonedRequest);
  }
}
