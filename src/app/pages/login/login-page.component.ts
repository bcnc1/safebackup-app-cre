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
const {dialog} = require('electron').remote;
const log = require('electron-log');

@Component({
  selector: 'app-login-page',
  templateUrl: './login-page.component.html',
  styleUrls: ['./login-page.component.scss']
})


export class LoginPageComponent implements OnInit {

  public username:any;
  public password:any;
  public program = "";
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
    @Inject(LOCAL_STORAGE) private storageService: StorageService
  ) {}


  initialize(username, password) {
    // Setting URL and headers for request
    log.info('login =>initialize version = ', M5MemberService.safebackupVersion);
    var options = {
        uri: M5MemberService.login,
        method: 'POST',
          headers: {
          'Content-Type': 'application/json'
        },
        body:{
          id:username,
          pwd:password,
          client: M5MemberService.safebackupVersion
        },
        json : true
    };
    // Return new promise 
    return new Promise(function(resolve, reject) {
      // Do async job
        // request.get(options, function(err, resp, body) {
        request.post(options, function(err, resp, body) {
            if (err) {
              log.error('11..로그인실패');
              reject(err);
            } else {
                if(resp.statusCode == 200){
                  log.info('login body = ',body);
                  var result = [];
                  result.push(body.token);
                  result.push(body.private);
                  result.push(body.noticeurgent);
                  result.push(body.nobackupdays);
                  result.push(body.limitsize);
                  log.info('login result = ',result);

                  var option2 = {
                    uri: 'https://ssproxy.ucloudbiz.olleh.com/v1/AUTH_10b1107b-ce24-4cb4-a066-f46c53b474a3/'+username,
                    method: 'GET',
                      headers: {
                      'X-Auth-Token': body.token
                    }
                  };
                  request.get(option2,function(err,res,body){
                    // log.info('login container = ',body);
                    if(res.statusCode == 200){
                      // log.info('container size res :',res);
                      // log.info('container size :',res.headers['x-container-bytes-used']);
                      result.push(res.headers['x-container-bytes-used']);
                      log.info('login result = ',result);
                      resolve(result);
                    }else{
                      log.info('23..로그인 성공, but 컨테이터 사이즈 0');
                      // log.info('container size res :',res);
                      // log.info('container size :',res.headers['x-container-bytes-used']);
                      // console.log('로그인성공, 컨테이너 0');
                      // console.log('container size res :',res);                         
                      result.push(res.headers['x-container-bytes-used']);                          
                      resolve(result);
                    }
                  })
                }else{
                  log.error('22..로그인실패');
                  reject(resp.headers);
                }
            }
        });
    });
  }
    
  onLoginB(member, popup, storage, router){
    log.info("onLoginB, member = ", member);
    if(member.program == null || member.program == undefined){
      storage.remove(member);
      let options = {
        message: '아이디, 비밀번호, 프로그램을 확인하세요'
      }
      dialog.showMessageBox(options);
      return;
    }
    var initializePromise = this.initialize(member.username, member.password);

    initializePromise.then(function(result) {
        var userToken = result[0];
        member.token = userToken;

        var userPrivate = result[1];
        member.private = userPrivate;
      
        member.noticeurgent = result[2];
        member.nobackupdays = result[3];
        member.limitsize = result[4];
        member.currentsize = result[5];
        // member.program = this.program;
        log.info("member before stored = ", member);
        storage.set('member',member);
        storage.set('login',true);
        
        router.navigateByUrl('/home');

    }, function(err) {
        log.error(err);
        storage.remove(member);
        let options = {
          message: '아이디, 비밀번호, 프로그램을 확인하세요'
        }
        dialog.showMessageBox(options);
    })
  }

  onLogin(username, password, program, popup) {
    //console.log('onLogin 22');
    log.info('로그인 버튼 누름 , id =',username,'pw = ',password);

    //로그인하고 토큰 재활용은 추후에..kimcy
    const member = new Member();

    if (username == null && password == null && program == null) {
      member.username = this.username;
      member.password = this.password;
      member.program = this.program;
      popup = true;
      log.info("111");
    } else {
      popup = false;
      member.username = username;
      member.password = password;
      member.program = program;
      log.info("222");
    }

    this.onLoginB(member, false, this.storageService, this.router);
  }

  ngOnInit(): void {
    
    this.loggingin = false;

    /*---------------------------------------------------------------
         이전 버전 (v1.0.xx) 인지 체크
     --------------------------------------------------------------*/
    console.log('login-page.component ');

    setTimeout(() => {
      // let username = localStorage.getItem('username');
      // let password = localStorage.getItem('password');
      this.member = this.memberAPI.isLoggedin();
      let username, password, program;

      if(this.member === undefined){
        console.log('처음실행 앱 안죽게');
        return;
      }else{
        username = this.member.username;
        password = this.member.password;
        program = this.member.program;
      }

      if (username != null && password != null) {

        username = username.replace(/"/g, '').replace(/"/g, '');
        password = password.replace(/"/g, '').replace(/"/g, '');

        console.log("11..oninit =>username :",username);
        console.log("11..oninit =>password :",password);
        console.log("11..oninit =>program :",program);

        this.migrating = false;
        this.migrateFromV1 = true;
        this.username = username;

        this.onLogin(username, password, program, false);

      } else {
        const member = this.storageService.get('member');
        password = password.replace(/"/g, '').replace(/"/g, '');

        if (member != null && password != null) {
          this.username = member.username;
          this.onLogin(member.username, password, member.program, false);
        }
      }
    }, 1000);
  }

}
