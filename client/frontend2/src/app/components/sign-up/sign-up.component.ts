import { Component, OnInit, ViewChild } from '@angular/core';
import { NgForm } from '@angular/forms';
import { Participant} from '../../model/participant';
import { ParticipantService } from 'src/app/services/participant.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-sign-up',
  templateUrl: './sign-up.component.html',
  styleUrls: ['./sign-up.component.css']
})
export class SignUpComponent implements OnInit {

  participant:Participant = new Participant();
  errorMessage: string;

  @ViewChild('f')
  myForm: NgForm;

  constructor(private service:ParticipantService, private router: Router) { }

  ngOnInit() {
  }

  onSubmit() {
    this.service.create(this.participant).subscribe( 
      (data) => {
        this.router.navigate(['/login'], {queryParams: { id: this.participant.id, msg: 'the user was successfuly addded - you can proceed with the login' } });
      },(error) => {
        this.errorMessage = error.error.message;
      }
    );

  }

}
