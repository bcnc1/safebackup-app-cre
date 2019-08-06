import {Component, Inject, OnInit} from '@angular/core';
import {M5MemberService} from '../../services/m5/m5.member.service';
import {Router} from '@angular/router';
import {Member} from '../../models';
import {LOCAL_STORAGE, StorageService} from 'ngx-webstorage-service';
import {M5PostService} from '../../services/m5/m5.post.service';
import {ObjectUtils} from '../../utils/ObjectUtils';
import {NGXLogger} from 'ngx-logger';
const request = require('request');
const reqestProm = require('request-promise-native');

@Component({
  selector: 'app-login-page',
  templateUrl: './login-page.component.html',
  styleUrls: ['./login-page.component.scss']
})


export class LoginPageComponent implements OnInit {

  public username;
  public password;
  public loggingin;

  private passwords;
  private passwordIndex = 0;
  private oldPaths = new Array(2);
  private migrateFromV1 = false;
  public migrating = false;
  private member;
  //public userToken;

  

  constructor(
    private memberAPI: M5MemberService,
    private postAPI: M5PostService,
    private logger: NGXLogger,
    private router: Router,
   // private userToken : string,
    

    @Inject(LOCAL_STORAGE) private storageService: StorageService) {
  }

      initialize(username, password) {
        // Setting URL and headers for request
        var options = {
            // uri: M5MemberService.s3Auth,
            // headers: {
            //   'X-Auth-New-Token': 'true',
            //   'x-storage-user': 'doctorkeeper'+':'+username,
            //   'x-storage-pass': password
            // }
            uri: M5MemberService.apiServer,
            method: 'POST',
             headers: {
              'Content-Type': 'application/json'
            },
            body:{
              id:username,
              pwd:password
            },
            json : true
        };
        // Return new promise 
        return new Promise(function(resolve, reject) {
          // Do async job
           // request.get(options, function(err, resp, body) {
            request.post(options, function(err, resp, body) {
                if (err) {
                  console.log('11..로그인실패');
                    reject(err);
                } else {
                    if(resp.statusCode == 200){
                     // resolve(resp.headers['x-auth-token']);
                     resolve(body.token);
                    }else{
                      console.log('22..로그인실패');
                      //resolve(resp.headers['x-auth-token']);
                      reject(resp.headers);
                    }
                }
            });
        });

    }
    
    onLoginB(member, popup, storage, router){
      var initializePromise = this.initialize(member.username, member.password);

      initializePromise.then(function(result) {
          var userToken = result;
          console.log("userToken :",userToken);
          member.token = userToken;
          storage.set('member',member);
          
          router.navigateByUrl('/home');

          // this.notification.next({
          //   cmd: 'LOGIN-SUCCESS',
          //   message: '[' + (this.folderIndex + 1) + '] ' + this.filesToSend[item.index].file.filename + ' 업로딩...' + size 
          // });
      }, function(err) {
          console.log(err);
          storage.remove(member);
          //kimcy:windows 릴리즈 모드에서 팝업뜬다음 에디트텍스트가 입력안되는 현상이 발생
          //alert('ID/패스워드를 확인하세요.');
      })
    }




  onLogin(username, password  , popup) {
    console.log('onLogin 22');

    //현재는 무조건 로그인과정이 다시 필요 kimcy
    // if (this.storageService.get('member') != null) {
    //   console.log('login-oage, 그냥 홈으로..');
    //   this.router.navigateByUrl('/home');
    //   return;
    // }

    //로그인하고 토큰 재활용은 추후에..kimcy
    const member = new Member();

    if (username == null && password == null) {
      member.username = this.username;
      member.password = this.password;
      popup = true;

      console.log('11..',this.username, this.password);
    } else {
      popup = false;
      member.username = username;
      member.password = password;
      console.log('22..',this.username, this.password);
    }

    //kimcy: 토큰은 여기서 넣어준다..
    this.onLoginB(member, false, this.storageService, this.router);

    // this.loggingin = true;
    // this.memberAPI.login(member).subscribe(
    //   response => {
    //     {
    //       this.loggingin = true;
    //       this.logger.debug('로그인하면..', response);
    //       if (ObjectUtils.isNotEmpty(this.oldPaths[0])) {
    //         console.log("path1 = ",this.oldPaths[0]);
    //         this.storageService.set('folder:' + response.member['id'] + ':' + 0, this.oldPaths[0]);
    //       }
    //       if (ObjectUtils.isNotEmpty(this.oldPaths[1])) {
    //         this.storageService.set('folder:' + response.member['id'] + ':' + 1, this.oldPaths[1]);
    //         console.log("path2 = ", this.oldPaths[1]);
    //       }
    //       this.storageService.set('password', member.password);
    //       //kimcy: add
    //       console.log('33..',member.username);
    //       this.storageService.set('username', member.username);
    //       this.router.navigateByUrl('/home');
    //     }
    //   },
    //   error => {
    //     this.loggingin = true;
    //     if (error.code != null) {
    //       if (error.code === 1040) {
    //         const memberForm = new Member();
    //         memberForm.fullname = member.username;
    //         memberForm.username = member.username;
    //         memberForm.password = member.password;

    //         if (this.migrateFromV1) {
    //           this.memberAPI.signup(memberForm).subscribe(
    //             response => {
    //               {
    //                 this.logger.debug('SIGNUP', response);
    //                 this.migrating = false;
    //                 this.onLogin(member.username, member.password, false);

    //               }
    //             },
    //             signupError => {
    //               if (signupError.code != null) {
    //                 this.migrating = false;
    //                 // alert(signupError.message);
    //               } else {
    //                 this.migrating = false;
    //                 // alert(signupError);
    //               }
    //             });npm
    //         } else {
    //           if (popup === true) {
    //             // alert('아이디를 확인하세요. 가입을 원하시면 관리자에게 연락하시기 바랍니다.');
    //           }
    //         }
    //       } else if (error.code === 1070) {
    //         if (popup === true) {
    //            alert('비밀번호를 확인하세요.');
    //         }
    //       }
    //     } else if (error.message != null) {
    //       this.migrating = false;
    //       if (popup === true) {
    //         // alert(error.message);
    //       }
    //     } else {
    //       this.migrating = false;
    //       if (popup === true) {
    //         // alert(error);
    //       }
    //     }

       

    //     setTimeout(() => {
    //       // member.username = username;
    //       // member.password = this.passwords[this.passwordIndex % 2];
    //       // this.passwordIndex++;

    //       this.onLogin(member.username, member.password, false);
    //     }, 60 * 5 * 1000);
    //   }
    // );

    //kimcy kt s3
    
  }

  onSignup() {
    this.router.navigateByUrl('/signup');
  }

  ngOnInit(): void {
    
    console.log('loginin ngOnInit, 여기가 시작인듯');
    this.loggingin = false;

    /*---------------------------------------------------------------
         이전 버전 (v1.0.xx) 인지 체크
     --------------------------------------------------------------*/
     console.log('login-page.component ');

    setTimeout(() => {
      // let username = localStorage.getItem('username');
      // let password = localStorage.getItem('password');
      this.member = this.memberAPI.isLoggedin();
      let username, password;

      console.log('this.member : ',this.member);
      if(this.member === undefined){
        console.log('처음실행 앱 안죽게');
        return;
      }else{
        username = this.member.username;
        password = this.member.password;
      }

      if (username != null && password != null) {

        username = username.replace(/"/g, '').replace(/"/g, '');
        password = password.replace(/"/g, '').replace(/"/g, '');

        console.log("11..oninit =>username :",username);
        console.log("11..oninit =>password :",password);
        // 이전버전은 삭제
        //this.migrating = true;
        //kimcy
        this.migrating = false;
        this.migrateFromV1 = true;
        this.username = username;
        this.oldPaths[0] = localStorage.getItem('uploadPath[0]:' + username);
        this.oldPaths[1] = localStorage.getItem('uploadPath[1]:' + username);

       // this.storageService.remove('username');
       //kimcy: 유저토큰을 가져온다
       //this.onLoginB(username, password, false, this.storageService);

        this.onLogin(username, password, false);
       // console.log("지우고..username :",username);

      } else {
        const member = this.storageService.get('member');
        password = password.replace(/"/g, '').replace(/"/g, '');

        // console.log("22..oninit =>username :",username);
        // console.log("22..oninit =>password :",password);
        if (member != null && password != null) {
          this.username = member.username;
          this.onLogin(member.username, password, false);
        }
      }
    }, 1000);
  }

}
