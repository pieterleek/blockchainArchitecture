import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Participant } from '../model/participant';
import { EventService } from './event.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  currentUser: Participant = null;

  constructor(private httpClient: HttpClient, private eventService: EventService) { }

  auth(participant) {

    let observable = this.httpClient.post<Participant>('http://localhost:8080/rest/participants/auth', { id: participant.id });

    observable.subscribe((data) => {
      this.currentUser = data;
      this.eventService.subscribe(this.currentUser.id);
    },
    (err) => {  
      this.currentUser = null;
    })

    return observable;
  }

  logout() {
    this.currentUser = null;
    this.eventService.unsubscribe();
  }
}
