import { Component, OnInit, ViewChild } from '@angular/core';
import { AuthService } from 'src/app/services/auth.service';
import { Router, Params, ActivatedRoute } from '@angular/router';
import { Participant } from 'src/app/model/participant';
import { NgForm } from '@angular/forms';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {

  participant:Participant = new Participant();
  errorMessage: string;
  welcomeMessage: string;

  @ViewChild('f', { static: false })
  myForm: NgForm;

  constructor(private authService: AuthService, private router:Router, private route: ActivatedRoute) { }

  ngOnInit() {
    this.route.queryParams.subscribe(
      (params: Params) => {
        console.log('params',params)
        this.participant.id = params['id'];
        this.welcomeMessage = params['msg'];
      });
  }

  onSubmit() {
    this.authService.auth(this.participant).subscribe((data) => {
      this.router.navigate(['/']);
    }, (error) => {
      this.errorMessage = error.error.message;
    });
  }

}
