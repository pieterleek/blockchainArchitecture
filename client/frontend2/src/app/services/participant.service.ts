import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Participant } from '../model/participant';

@Injectable({
  providedIn: 'root'
})
export class ParticipantService {

  constructor(private httpClient: HttpClient) { }

  create(participant: Participant) {
    return this.httpClient.post('http://localhost:8080/rest/participants', participant);
  }
}
