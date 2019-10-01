import { Component, Inject, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { M5MemberService } from '../../services/m5/m5.member.service';
import { LOCAL_STORAGE, StorageService } from 'ngx-webstorage-service';
import { ElectronService } from 'ngx-electron';
import { M5PostService } from '../../services/m5/m5.post.service';
import { UploadFiletreeService } from '../../services/upload.filetree.service';
import { BsModalRef, BsModalService, ModalModule } from 'ngx-bootstrap';
import * as path from 'path';
import { KonsoleService } from '../../services/konsole.service';
import * as moment from 'moment';
import { ObjectUtils } from '../../utils/ObjectUtils';
import { NGXLogger } from 'ngx-logger';
import { environment } from '../../../environments/environment';
const log = require('electron-log');

@Component({
  selector: 'app-page',
  templateUrl: './home-page.component.html',
  styleUrls: ['./home-page.component.scss']
})


export class HomePageComponent implements OnInit, OnDestroy {
  private MAXFOLDERLENGTH = 3;
  public version: string;
  private board;
  public member;
  private deviceResource;
  private uploadSubscribe;


  private accessToken;

  public rootFolderName;
  public rootFolderData;
  public parentFolder;

  private foldersSize = new Array(this.MAXFOLDERLENGTH);
  private storedFolders = {};
  public selectedFolderIndex = 0;
  public showingFolderName;
  public showingFileList = [];
  public showingFolderList = [];

  public uploading = false;
  private alertModal: BsModalRef;
  public memberPrivate = false;

  constructor(
    private memberAPI: M5MemberService,
    private postAPI: M5PostService,
    private electronService: ElectronService,
    private uploadFiletreeService: UploadFiletreeService,
    private konsoleService: KonsoleService,
    private logger: NGXLogger,
    @Inject(LOCAL_STORAGE) private storageService: StorageService,
    private modalService: BsModalService,
    private router: Router) {
  }


  private getFolderKey(folderIndex) {  //폴더+사용자이름+폴더index 붙여서 return
    console.log('home-page, getFolderKey => folderIndex ',folderIndex, this.member.username);

    this.member = this.memberAPI.isLoggedin();

    const key = 'folder:' + this.member.username + ':' + folderIndex;
    this.logger.debug('FOLDERKEY', key, 'username = ' + this.member.username);
    console.log('FOLDERKEY', key, 'username = ' + this.member.username)
    return key;
  }


  onLogout() {
    //console.log('로그아웃버튼 눌림');
    log.info('로그아웃버튼 눌림');
    this.uploadFiletreeService.setUploadingStatus(false);
    this.uploadFiletreeService.setUploadMember(null);
    this.uploading = false;
    this.memberAPI.logout();
    this.router.navigateByUrl('/');
  }

  // gotoRoot(){
  //   this.router.navigateByUrl('/');
  // }
  /*-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=
   *  탭 버튼을 누를경우 저장된 폴더의 패스를 구해와서 보여주기 위한 것임
   -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=*/
  onTab(tabIndex) {
    console.log('탭이 선택됨', tabIndex);
    this.selectedFolderIndex = tabIndex;
    const folderKey = this.getFolderKey(tabIndex);
    const folder = this.storageService.get(folderKey);

    console.log('folderKey = ', folderKey, 'folder = ', folder);

    this.logger.debug('FOLDERNAME', folder, folderKey);
 

    if (folder != undefined) {
      this.rootFolderName = folder;
      this.showingFolderName = folder;
      this.onRequestFolderPosts(this.selectedFolderIndex, folder, null);
      console.log('deviceResource = ',this.deviceResource);
      if (this.deviceResource == null) {
        setTimeout(() => {
          console.log('2초후 , onRequestFolderData');
          this.onRequestFolderData(this.selectedFolderIndex);
        }, 2000);
      } else {
        console.log('onRequestFolderData');
        this.onRequestFolderData(this.selectedFolderIndex);
      }
    } else {
      //설정한 폴더가 없다면??
      console.log('살정한 폴더가 없음');
      this.rootFolderName = '';
      this.showingFolderName = '';
      this.showingFolderList = [];
      this.showingFileList = [];
      //this.uploadFiletreeService.fillFollders(); 
      //this.fillFolders();
    }
  }

  /*-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=
   *  home화면에서 폴더선택시 불려진다
   *  해당 이벤트 발생시  db를 갱신한다.
   -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=*/
  onChangeFolder(folderIndex) {
    this.selectedFolderIndex = folderIndex;
    log.info('보냄,home-page, onChangeFolder, SELECTFOLDER ,  folderIndex = ',folderIndex );
    this.electronService.ipcRenderer.send('SELECTFOLDER', {
      folderIndex: folderIndex,
      username: this.member.username
    });
    this.storageService.set('login',false);

  }


  onRequestFolderData(folderIndex) {
    console.log('home-page, onRequestFolderData');
    if (this.deviceResource == null) {
      this.deviceResource = { macaddress: 'MAC' };
    }
    const folderKey = this.getFolderKey(folderIndex);
    const folder = this.storageService.get(folderKey);
    console.log('home-page, 22.. onRequestFolderData, folder = ',folder);
  }


  /*-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=
   *  Get FileTree from server
   -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=*/
  onRequestFolderPosts(folderIndex, gotoPath, files) {
    console.log('homepage => onRequestFolderPosts', folderIndex, gotoPath, files);
    if (gotoPath === undefined) {
      return;
    }

    this.showingFolderName = gotoPath;
    this.showingFolderList = [];
    this.showingFileList = [];
    const paths = path.dirname(gotoPath).split(path.sep);
    this.parentFolder = paths.slice(0, paths.length).join('/');

    this.logger.debug('SUBFOLDER', gotoPath, this.parentFolder);
    //kimcy: 이걸보여주면? 무엇이?
    //this.showingFolderList.push(this.parentFolder); //test code html line95에서 폴더 타이틀 찾는 부분에서 죽는다.

  }


  //kimcy: folderIndex 가 0이면 처음부터 시작
  onStartUploadFolder(folderIndex, after) {
    log.info('home-page, onStartUploadFolder, folderIndex = ',folderIndex, 'after = ',after);

    if (after == null) {
      after = 5;
    }
     const folderKey = this.getFolderKey(folderIndex);
     const folder = this.storageService.get(folderKey);  //폴더키로 조회하면 선택한 폴더를 스토리지로 부터 얻을 수 있다.
     log.info('home-page folder = ', folder, 'folderKey = ', folderKey);

    // //업로드는 됬으나 블록체인에 기록안된 경우 맨처음 올려야..
    // if(this.storageService.get('createProof') != undefined){
    //   this.konsoleService.sendMessage('블록체인에 업데이트 중입니다.');
    //   this.uploadFiletreeService.setUploadingStatus(true);
    //  const path = this.storageService.get('createProof');  //문제된 넘 부터 올리게..
    //  this.postAPI.createProof(M5MemberService.create,this.member, path, 0, 0).subscribe(
    //   response => {

    //     console.log('성공');
    //     let chainArray = new Array();
    //     var str = {name : path, status: true};
    //     var jsonStr = JSON.stringify(str);
    //     console.log('jsonStr = ',jsonStr);

    //     if(this.storageService.get('chain') == undefined){
    //       console.log('맨처음');
    //       chainArray.push(JSON.parse(jsonStr));
    //       this.storageService.set('chain', chainArray); 
    //     }else{
    //       console.log('덫붙이기 chainArray = ',chainArray);
    //       chainArray = this.storageService.get('chain');
    //       chainArray.push(JSON.parse(jsonStr));
    //       this.storageService.set('chain', chainArray); 
    //     }
       
    //     this.storageService.remove('createProof'); //에러가 없음으로 해당 파일을 지운다.
    //     this.konsoleService.sendMessage('블록체인에 업데이트 됬습니다.');
    //     this.uploadFiletreeService.setUploadingStatus(false);
    //   },
    //   error => {
    //     var str = {name : path, status: false};
    //     this.uploadFiletreeService.setUploadingStatus(false);
    //     console.log('실패');
    //     this.konsoleService.sendMessage('블록체인에 업데이트 실패 ')
    //     // var message = ' : 블록체인에 에러가 발생했습니다.  (' + (index + 1) + '/' + decodeURI(path) + ')';
    //     // console.log(message);
    //     // //메세지를 뿌릴려고..
    //     // noti.next({
    //     //   cmd: 'LOG',
    //     //   message: '[' + (index + 1) + '] ' + message
    //     // });
    //   }
    // );;
    
    // }

    setTimeout(()=> {
       log.info('setTimeout, folderIndex = ', folderIndex, 'folder = ',folder, 'after = ',after);
       this.uploading = true;
       this.uploadFiletreeService.upload(folderIndex, folder);
    }, after * 1000);  //보통은 로그인후 3초후에 시작, 여기서 시간값을 바꾸면 시작값이 안 맞는다.(다음폴더는 5초후에), 백업시작버튼누르면 3초후에, 다음번은 1~4시간안에
  }

  //업로드 종료후 토큰 갱신
  // onStartUploadFolderNext(folderIndex, after) {
  //  // console.log('home-page, onStartUploadFolder, folderIndex = ',folderIndex, 'after = ',after);
  //   if (after == null) {
  //     after = 5;
  //   }
  //   const folderKey = this.getFolderKey(folderIndex);
  //  // console.log('home-page folderKey = ', folderKey);

  //   const folder = this.storageService.get(folderKey);

  //   this.memberAPI.getLoginToken(this.member,this.storageService);

  //   setTimeout(() => {
  //     console.log('setTimeout, folderIndex = ', folderIndex);
  //     this.uploading = true;
  //     this.uploadFiletreeService.upload(folderIndex, folder);
  //   }, after * 1000);  //보통은 로그인후 3초후에 시작, 여기서 시간값을 바꾸면 시작값이 안 맞는다.(다음폴더는 5초후에), 백업시작버튼누르면 3초후에, 다음번은 1~4시간안에
  // }

  onStartBrowser(){
    require('electron').shell.openExternal("http://211.252.85.59/login");
  }

  fillFolders() {
    console.log('home-page, fillFolders MAXFOLDERLENGTH = ', this.MAXFOLDERLENGTH);
    for (let i = 0; i < this.MAXFOLDERLENGTH; i++) {
      const folderKey = this.getFolderKey(i);
      this.storedFolders[i] = this.storageService.get(folderKey); //얻은키를 활용하여 선택된 폴더를 반환한다.
      if (this.selectedFolderIndex === i) {
        this.showingFolderName = this.storedFolders[i];
      }
    }
  }

  ngOnDestroy() {
   // console.log('home-page, ngOnDestroy');
    this.uploadSubscribe.unsubscribe();
  }


  ngOnInit() {
    console.log('home-page, ngOnInit');
    this.version = environment.VERSION;
    this.electronService.ipcRenderer.send('PCRESOURCE', null);
    console.log('보냄 home-page, PCRESOURCE');
    this.logger.debug('- HOMEPAGE ngOnInit: ', this.version);

    this.member = this.memberAPI.isLoggedin();
    this.memberPrivate = this.member.private;

    this.memberPrivate ? this.MAXFOLDERLENGTH =1 : this.MAXFOLDERLENGTH =2;
    console.log('home-page, ngOnInit this.MAXFOLDERLENGTH' ,this.MAXFOLDERLENGTH);

    console.log('11..맴버 = ', this.member.private);
    function getRandomInt(min, max) {
     // console.log('home-page, getRandomInt');
      return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    


    var div1 = window.document.getElementById('tab2');
    //div1.
   // console.log('div1 =',div1);

    /*---------------------------------------------------------------
           Subscribe to notification
     ----------------------------------------------------------------*/
  
    this.uploadSubscribe = this.uploadFiletreeService.notified().subscribe(message => {


      if (message.cmd === 'LOG') {
        /*---------------------------------------------------------------
              일반 로그
         ----------------------------------------------------------------*/
        this.konsoleService.sendMessage(message);
      } else if (message.cmd === 'SENDING.STARTED') {
        /*---------------------------------------------------------------
              파일전송 시작 로그
         ----------------------------------------------------------------*/
        console.log('home => 파일전송시작 로그');
        this.konsoleService.sendMessage(message);
      } else if (message.cmd === 'SENDING.PROGRESS') {
        /*---------------------------------------------------------------
              파일전송 시작 로그
         ----------------------------------------------------------------*/
        this.konsoleService.sendMessage(message);
      } else if (message.cmd === 'FOLDER.INFO') {

        this.foldersSize[message.folderData.index] = message.folderData.size;
        this.logger.debug('FOLDER.INFO', message, this.foldersSize);
      } else if (message.cmd === 'FOLDER.SENT') {
        /*---------------------------------------------------------------
              폴더 전송 완료
         ----------------------------------------------------------------*/
        console.log('homepage -> 폴더전송완료');
        this.logger.debug(new Date(), message);
        log.info('homepage => 전송완료된 폴더 folderIndex : ', message.folderIndex, 
                     'MAXFOLDERLENGTH = ',this.MAXFOLDERLENGTH);
       // this.memberPrivate ? this.MAXFOLDERLENGTH =1 : this.MAXFOLDERLENGTH =2;
        if (this.MAXFOLDERLENGTH - 1 > message.folderIndex && this.memberPrivate == false) {
          console.log('11..다음 폴더 +1해서 = ',message.folderIndex +1);
          this.onStartUploadFolder(message.folderIndex + 1, 5);
        } 
        // else if(message.cmd === 'LIST.COMPLETE'){  //이거 지금 안 불림..
        //   //kimcy token 갱신
        //   if (this.electronService.isElectronApp){
        //     this.member = this.memberAPI.isLoggedin();
        //     if(this.member === undefined){
        //       //로그인
        //       this.router.navigateByUrl('/login');
        //       return;
        //     }else{
        //       console.log('새로운 토큰 가져오기');
        //       this.memberAPI.getLoginToken(this.member,this.storageService);
        //     }
        //   }
        // } 
        else {
          console.log('homepage -> 모두완료 다음시간설정');
          this.uploading = false;
          //kimcy: test code
          const minutes =  60 * getRandomInt(1, 4); //5*getRandomInt(1, 4); //60 * getRandomInt(1, 4); //1분부터 4분까지 랜덤
          const interval = 1000 * 60 * minutes;
          const next = moment().add(interval);
          const str = next.format('MM월DD일 HH시 mm분');
          this.konsoleService.sendMessage({
            cmd: 'LOG',
            message: str + '에 백업이 재실행됩니다.'
          });
          this.logger.debug(new Date(), '다음 백업 대기 업로딩? ', this.uploading);
          this.onStartUploadFolder(0, interval / 1000);
         // this.onStartUploadFolderNext(0, interval / 1000); //여기서 토큰 갱신

        }


      }
    });


    /*---------------------------------------------------------------
              Storage로부터 값을 받아와서  this.storedFolders를 초기화
    ----------------------------------------------------------------*/
    //this.memberPrivate ? this.MAXFOLDERLENGTH =1 : this.MAXFOLDERLENGTH =2;
    for (let i = 0; i < this.MAXFOLDERLENGTH; i++) {
      //console.log('Storage로부터 값을 받아와서  this.storedFolders를 초기화');
      const folderKey = this.getFolderKey(i);
      this.storedFolders[i] = this.storageService.get(folderKey);
    }

    /*---------------------------------------------------------------
           등록된 폴더에 대해 업로드를 실행  (현재는 모두 다시 올림)
           로그아웃 후 로그인 하는 경우
           맨처음 로그인하고 불림(1번만)
     ----------------------------------------------------------------*/
      //kimcy: 로그인한 직후에는 업로드목록을 갱신해야..
      // if(this.storageService.get('login') == true){
      //   this.uploadFiletreeService.getContainerList(this.storageService, function(result){
      //     if(result == true){
      //        console.log('로그인 후 업로드 시작 = ');
      //       //this.MAXFOLDERLENGTH = 3
      //       for (let i = 0; i < 3; i++) {
      //         this.uploading = false;
      //        // console.log('storedFolders = ',this.storedFolders[i]);
      //         if (this.storedFolders[i] != undefined) {
      //           console.log('등록된 폴더에 대해 업로드를 실행', this.storedFolders[i].length); //폴더의 이름 길이
      //           this.uploadFiletreeService.upload(i, this.storedFolders[i]);
      //           break;
      //         }
      //       }
      //     }else{
      //       console.log('목록을 가져오지 못했음'); //이 경우 다시 처음부터 올려야 하나? 그럴경우 블록체인에서 에러 나옴..
      //       this.konsoleService.sendMessage('KT서버 응답을 받지 못했습니다. 다시 로그인하세요');
      //     }
      //   });
      // }
      



    // setTimeout(() => {
      
    //  // console.log('10초후 등록된 폴더에 대해 업로드를 실행 ??');
    //   if(this.storageService.get('login') == true){
    //     for (let i = 0; i < this.MAXFOLDERLENGTH; i++) {
    //       this.uploading = false;
    //      // console.log('storedFolders = ',this.storedFolders[i]);
    //       if (this.storedFolders[i] != undefined) {
    //         log.info('등록된 폴더에 대해 업로드를 실행', this.storedFolders[i].length); //폴더의 이름 길이
    //         this.uploadFiletreeService.upload(i, this.storedFolders[i]);
    //         break;
    //       }
    //     }
    //   }
      
    // }, 10000);  //폴더선택후 3초후에 업로드시작이기때문에 처음로그인해서는 5초보다는 길어야.. 10초후

    /*----------------------------------------------------
       *  IPC Response : Get FileTree
       ----------------------------------------------------*/
    this.electronService.ipcRenderer.on('PCRESOURCE', (event: Electron.IpcMessageEvent, response: any) => {
      console.log('받음 home-page, PCRESOURCE, response = ',response);
      this.deviceResource = response;
    });


    /*---------------------------------------------------------------
           LISTENER : SELECTFOLDER의 리스너
           2번 선택되는 경우가 있음...이럴경우 db도 2번 불린다.
           같은폴더 다른계정으로 ...할 경우 2번
     ----------------------------------------------------------------*/

    this.electronService.ipcRenderer.on('SELECTFOLDER', (event: Electron.IpcMessageEvent, response: any) => {
      //log.info('SELECTFOLDER', response, this.uploading);
      log.info('받음,home-page, SELECTFOLDER = ',response.directory);
      if (response.directory != null) {
        //console.log('home-page, directory', response.directory);
        log.info('home-page, directory 선택 완료', response.directory);
        const folderKey = this.getFolderKey(response.folderIndex);

        console.log('home-page, SELECTFOLDER => folderKey', folderKey);

        this.storageService.set(folderKey, response.directory[0]); //key: 예:folder:pharmbase:0
        this.fillFolders();

        this.uploadFiletreeService.fillFollders();
        console.log('home-page, uploading?? ', this.uploading)
        if (this.uploading === false) {
          log.info('home-page, SELECTFOLDER ?? folderIndex = ', response.folderIndex)
          this.storageService.set('login',false);
          this.onStartUploadFolder(response.folderIndex, 3);  //3초후에 업로드
        }
      }
    });


    /*---------------------------------------------------------------
           서버에 저장된 Folder의 File 목록들을 받아온다
           (초기 목록 보여주기 용)
     ----------------------------------------------------------------*/
    this.onTab(0);
  }

}
