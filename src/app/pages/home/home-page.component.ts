import { Component, Inject, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { M5MemberService } from '../../services/m5/m5.member.service';
import { LOCAL_STORAGE, StorageService, StorageTranscoders } from 'ngx-webstorage-service';
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
import { fstat } from 'fs';

const log = require('electron-log');
const fs = require('fs');

@Component({
  selector: 'app-page',
  templateUrl: './home-page.component.html',
  styleUrls: ['./home-page.component.scss']
})


export class HomePageComponent implements OnInit, OnDestroy {
  
  private PRIVATE_FLENGTH = 3;
  private PUBLIC_FLENGTH =3;
  //private MAXFOLDERLENGTH = this.PRIVATE_FLENGTH + this.PUBLIC_FLENGTH;

  public version: string;
  public member;
  private deviceResource;
  private uploadSubscribe;

  public rootFolderName;
  public rootFolderData;
  public parentFolder;

  private foldersSize; 
  private storedFolders = {};
  public selectedFolderIndex = 0;
  
  public showingFolderName;
  public showingFolderName0;
  public showingFolderName1;
  public showingFolderName2;

  public showingFileList = [];
  public showingFolderList = [];

  public uploading = false;
  private alertModal: BsModalRef;
  public memberPrivate = false;
  private maxFolder;
  private timergetTree;
  private timerStart;

    private option4;

  public pharmProgram = "";

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
   // log.info('home-page, getFolderKey => folderIndex ',folderIndex, this.member.username);
    this.member = this.memberAPI.isLoggedin();
    const key = 'folder:' + this.member.username + ':' + folderIndex;
   // log.info('FOLDERKEY', key, 'username = ' + this.member.username)
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
    this.timerClear();
    this.electronService.ipcRenderer.removeAllListeners('SELECTFOLDER');
  }

  /*-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=
   *  탭 버튼을 누를경우 저장된 폴더의 패스를 구해와서 보여주기 위한 것임
   -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=*/
  onTab(tabIndex) {
    console.log('탭이 선택됨', tabIndex);
    this.selectedFolderIndex = tabIndex;
    const folderKey = this.getFolderKey(tabIndex);
    const folder = this.storageService.get(folderKey);

    console.log('folderKey = ', folderKey, 'folder = ', folder);


    if (folder != undefined) {
      this.rootFolderName = folder;
      this.showingFolderName = folder;
      this.onRequestFolderData(this.selectedFolderIndex);
 
    } else {
      //설정한 폴더가 없다면??
      console.log('설정된 폴더가 없음');
      this.rootFolderName = '';
      this.showingFolderName = '';
      this.showingFolderList = [];
      this.showingFileList = [];

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

  onNullifyFolder(folderIndex) {
    // this.selectedFolderIndex = folderIndex;
    log.info('Nullify selected Folder, folderIndex = ',folderIndex );
    const folderKey = this.getFolderKey(folderIndex);
    // this.storageService.set(folderKey, ''); //key: 예:folder:pharmbase:0
    this.storageService.remove(folderKey);
    this.showingFolderName = '';
    // this.electronService.ipcRenderer.send('SELECTFOLDER', {
    //   folderIndex: folderIndex,
    //   username: this.member.username
    // });
    // this.storageService.set('login',false);
    this.ReadFolderInfo();
  }

  onRequestFolderData(folderIndex) {
    // console.log('home-page, onRequestFolderData');
    console.log('this.deviceResource ',this.deviceResource);
    if (this.deviceResource == null) {
      this.deviceResource = { macaddress: 'MAC' };
    }
    const folderKey = this.getFolderKey(folderIndex);
    const folder = this.storageService.get(folderKey);

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

  }

  onRetryUpload(){
    log.info('재 시작');
    if(this.uploading == true && this.storageService.get('upload') == 'error'){
      this.uploading = false;
      this.storageService.set('upload', 'init');
    }

    log.info('this.uploading = ',this.uploading);
    this.onStartUploadFolder(0, 3);
  }
  //kimcy: folderIndex 가 0이면 처음부터 시작
  //case1: 폴더선택시: folderIndex: 선택한 폴더, after: 3
  //case2: 자동로그인시: folderIndex: 0, after: 2
  //case3: 업로드완료: folderIndex: 0, after: 1~4시간사이 랜덤
  //case4: 업로드완료 후 다음폴더: folderIndex: 다음폴더, after: 5
  onStartUploadFolder(folderIndex, after) {
    //after 3이면 백업버튼?
    if (after == null) {
      after = 6;
    }
    const folderKey = this.getFolderKey(folderIndex);
    const folder = this.storageService.get(folderKey);  //폴더키로 조회하면 선택한 폴더를 스토리지로 부터 얻을 수 있다.
    log.info('home-page onStartUploadFolder = ', folder, 'folderKey = ', folderKey, 'after = ',after);

    this.timergetTree =  setTimeout(()=> {
        //log.info('fscan = ', this.storageService.get('fscan'));
        if(!this.uploading){
          this.uploading = true;
          this.uploadFiletreeService.getFolderTree(folderIndex, folder, this.member);
        }else{
          log.info('업로드 중이라 다시 셋팅 값 = ', after);
          this.onStartUploadFolder(folderIndex, after)
        }
    }, after * 1000);  

     
  }

  checkEmergency(){
    //log.info("his.maxFolder = ",this.maxFolder);
    for (let i = 0; i < this.maxFolder; i++) {
      const folderKey = this.getFolderKey(i);
      this.storedFolders[i] = this.storageService.get(folderKey); //얻은키를 활용하여 선택된 폴더를 반환한다.
      log.info(" this.storedFolders[i] = ", this.storedFolders[i]);
      if(this.storedFolders[i] == null){
        
        log.info('맨처음 생략');
        return false;
      }
      
      if(this.storedFolders[i].toLowerCase().indexOf('data_backup') >= 0){
        //lib..호환때문에..
        //log.info(" 저장값은?? ", this.storageService.get('data_backup',StorageTranscoders.STRING));
        //var isZip =  this.storageService.get('data_backup',StorageTranscoders.STRING);
        if( this.storageService.get('data_backup',StorageTranscoders.STRING)  === "none"){
          log.info(" 긴급점검!! ");
          return true;
        }else{
          log.info(" 긴급점검 아님 ");
          return false;
        }
      }else{
        log.info(" databackup폴더아님 ");
        return false;
      }
    }

  }

  checkDay(day){
    //저장된파일이름
    //let filename;
    //let maxDate = moment().year(1990).month(0).date(1);
    let filename = this.storageService.get('data_backup',StorageTranscoders.STRING);
    log.info('checkDay => filename = ',filename);
    if(filename != "none" && filename != "undefined"){
      const fyyyy = Number(filename.substr(0, 4));
      const fmm = Number(filename.substr(4, 2));
      const fdd = Number(filename.substr(6, 2));
      const fdate = moment([fyyyy, fmm - 1, fdd]);
      let minDiff = moment().diff(fdate, 'days') + 1;
      log.info('minDiff = ',minDiff);
      if (minDiff >= day) {
        return true;
      }else{
        return false;

      }
    }else{
      log.error('checkDay, 저장된 zip파일명 없음')
      return false;
    }
  }

  onStartBrowser(){
    require('electron').shell.openExternal("http://211.252.85.59/login");
  }

  fillFolders() {

    for (let i = 0; i < this.maxFolder; i++) {
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

  timerClear(){
    clearTimeout(this.timergetTree);
    clearTimeout(this.timerStart);
  }

  ReadFolderInfo(){
    this.showingFolderName0 = (this.storageService.get(this.getFolderKey(0)) == undefined ?'': this.storageService.get(this.getFolderKey(0)));
    this.showingFolderName1 = (this.storageService.get(this.getFolderKey(1)) == undefined ?'': this.storageService.get(this.getFolderKey(1)));
    this.showingFolderName2 = (this.storageService.get(this.getFolderKey(2)) == undefined ?'': this.storageService.get(this.getFolderKey(2)));
    // location.reload();
  }

  ngOnInit() {
    this.version = environment.VERSION;
    this.electronService.ipcRenderer.send('PCRESOURCE', null);
    
    this.member = this.memberAPI.isLoggedin();
    this.memberPrivate = this.member.private;

    this.pharmProgram = this.member.program;
    switch(this.pharmProgram) {
      case "pharm_3000":
        this.pharmProgram = "팜IT3000";
        break;
      case "u_pharm":
        this.pharmProgram = "유팜";
        break;
      case "e_pharm":
        this.pharmProgram = "이팜";
        break;
      case "on_pharm":
        this.pharmProgram = "온팜";
        break;
      case "ns_pharm":
        this.pharmProgram = "NS팜";
        break;
      case "cn_pharm":
        this.pharmProgram = "CN팜";
        break;
      default:
        this.pharmProgram = "";
    }

    if(this.memberPrivate){
      this.maxFolder = this.PRIVATE_FLENGTH;
      this.foldersSize = new Array(this.PRIVATE_FLENGTH);
    }else{
      this.maxFolder = this.PUBLIC_FLENGTH;
      this.foldersSize = new Array(this.PUBLIC_FLENGTH);
      this.storageService.set('maxfolder', this.maxFolder); 
    }

    function getRandomInt(min, max) {
      return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    /*---------------------------------------------------------------
           Subscribe to notification
     ----------------------------------------------------------------*/
    this.uploadSubscribe = this.uploadFiletreeService.notified().subscribe(message => {

      //this.uploadSubscribe.complete();
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
        //this.logger.debug('FOLDER.INFO', message, this.foldersSize);
      } else if (message.cmd === 'FOLDER.SENT') {
        /*---------------------------------------------------------------
              폴더 전송 완료
         ----------------------------------------------------------------*/
        // console.log('homepage -> 폴더전송완료');
        //this.logger.debug(new Date(), message);
        log.info('전송완료된 폴더 folderIndex : ', (message.folderIndex -1), );

        if(message.folderIndex < this.maxFolder){
          log.info('다음폴더 업로드 !!');
          this.uploading = false;
          this.onStartUploadFolder(message.folderIndex , 5);
        } else {
          log.info('homepage -> 모두완료 다음시간설정');

          // let top = '팜페이 스마트백업'
          // let msg = '팜페이 스마트백업에서 백업파일 업로드 작업을 완료하였습니다';
          // this.electronService.ipcRenderer.send('ALERT', {message: msg, title: top});
          this.electronService.ipcRenderer.send('Upload-Complete-Notice', null);
          this.electronService.ipcRenderer.send('DELETE-ZIP-FILE', null);
          // this.electronService.ipcRenderer.send('Restart-Backup-Check', null);

          this.uploading = false;
          //kimcy: test code

          const minutes =  60 * getRandomInt(5, 7); 
          const interval = 1000 * 60 * minutes;
          const next = moment().add(interval);
          
          //서버에서 배치타임 (delete)되는 시간을 벌어주기 위해
          if(moment().endOf('day').diff(next) < 0 ){
            //다음날임으로 6시간 후 시작
            // log.info('다음날임으로 6시간 후 시작');
            var nextTime = next.add(6,'hour');
            const str = nextTime.format('MM월DD일 HH시 mm분');
            this.konsoleService.sendMessage({
              cmd: 'LOG',
              message: str + '에 백업이 재실행됩니다.'
            });
          } else{
            let str = next.format('MM월DD일 HH시 mm분');
              if (this.member.program == 'ns_pharm' || this.member.program == 'cn_pharm') {
                  if (this.option4 !== 'YES') {
                      if (moment().hour() == 1) {
                          str = '05시 14분';
                      } else {
                          str = '00시 14분';
                      }
                  }
              }
            this.konsoleService.sendMessage({
              cmd: 'LOG',
              message: str + '에 백업이 재실행됩니다.'
            });
          }

          this.memberAPI.getLoginToken(this.member,this.storageService, (res) =>{
            if(res){
              this.member = this.storageService.get('member');
              // log.info('업로드 완료 후 this.member = > ', this.member);

              if(this.member.noticeurgent){
                // log.info('call => getUrgentNotice');
                this.memberAPI.getUrgentNotice(this.member,this.storageService, (response) =>{
                  
                  if(response){
                    // var urgent = this.storageService.get('urgent');
                    // log.info('urgent = ',urgent);
                    // this.electronService.ipcRenderer.send('ALERT-URGENT', {message: urgent.message, title: urgent.title});
                  }
                });
                
              } else if(this.member.nobackupdays > 0){
                this.memberAPI.getBackupDays(this.member,this.storageService, (response) =>{
                  
                  if(response){
                    // var backupdays = this.storageService.get('backupday');
                    // this.electronService.ipcRenderer.send('ALERT-BACKUP', {message: backupdays.message, title: backupdays.title});
                  }
                });
              }
            }
          }); //업로드 완료 후 토큰 갱신

            if (this.member.program=='pharm_3000'||this.member.program=='u_pharm'||this.member.program=='e_pharm'||this.member.program=='on_pharm') {
                this.onStartUploadFolder(0, interval / 1000);
            } else if (this.member.program == 'ns_pharm' && this.option4=='YES') {
                this.onStartUploadFolder(0, interval / 1000);
            } else if (this.member.program == 'cn_pharm' && this.option4 == 'YES') {
                this.onStartUploadFolder(0, interval / 1000);
            }
          // this.onStartUploadFolder(0, interval / 1000);
        }
      }
    });

    /*---------------------------------------------------------------
     * Storage로부터 값을 받아와서  this.storedFolders를 초기화

    ----------------------------------------------------------------*/
    this.fillFolders(); //??

    /*---------------------------------------------------------------
           등록된 폴더에 대해 업로드를 실행  
           맨처음 로그인하고 불림(1번만)
     ----------------------------------------------------------------*/
    this.timerStart = setTimeout(() => {
      // log.info('this.timerStart start');
        if(this.storageService.get('login') == true){
          for (let i = 0; i < this.maxFolder; i++) {
            this.uploading = false;
            // console.log('storedFolders = ',this.storedFolders[i]);
            if (this.storedFolders[i] != undefined) {
                if (this.member.program == 'pharm_3000' || this.member.program == 'u_pharm' || this.member.program == 'e_pharm' || this.member.program == 'on_pharm') {
                    this.onStartUploadFolder(i, 2);
                } else if (this.member.program == 'ns_pharm' && this.option4 == 'YES') {
                    this.onStartUploadFolder(i, 2);
                } else if (this.member.program == 'cn_pharm' && this.option4 == 'YES') {
                    this.onStartUploadFolder(i, 2);
                }
              // this.onStartUploadFolder(i, 2);
              break;
            }
          }
        }
        
    }, 3000);  //폴더선택


    /*----------------------------------------------------
       *  IPC Response : Get FileTree
    ----------------------------------------------------*/
    this.electronService.ipcRenderer.on('PCRESOURCE', (event: Electron.IpcMessageEvent, response: any) => {
      // console.log('받음 home-page, PCRESOURCE, response = ',response);
        this.deviceResource = response;
        //log.info('response', response);
        let userName = response.userName;
        this.option4 = response.option4;
        //log.info('response.option4', response.option4);
        //log.info('this.option4', this.option4);
        let folderKey = this.getFolderKey(1);
        this.storageService.set(folderKey, "C:\\Users\\"+userName+"\\AppData\\LocalLow\\NPKI");
        // console.log('folder 1',"C:\\Users\\"+userName+"\\AppData\\LocalLow\\NPKI");
        this.ReadFolderInfo();
    });


    /*---------------------------------------------------------------
           LISTENER : SELECTFOLDER의 리스너
    ----------------------------------------------------------------*/
    this.electronService.ipcRenderer.on('SELECTFOLDER', (event: Electron.IpcMessageEvent, response: any) => {
      this.electronService.ipcRenderer.removeListener('SELECTFOLDER', (event: Electron.IpcMessageEvent, response: any)=>{

      });

      if (response.directory != null) {

        const folderKey = this.getFolderKey(response.folderIndex);
        this.storageService.set(folderKey, response.directory[0]); //key: 예:folder:pharmbase:0
        this.fillFolders();

        //this.uploadFiletreeService.fillFollders(); 현재는 폴더인덱스만 있으면 됨
        // console.log('home-page, uploading?? ', this.uploading)
        if (this.uploading === false) {
          //log.info('home-page, SELECTFOLDER ?? folderIndex = ', response.folderIndex)
          this.storageService.set('login',false); 
            //if (!(this.member.program == 'ns_pharm' || this.member.program == 'cn_pharm')){
            //    this.onStartUploadFolder(response.folderIndex, 3);  //3초후에 업로드
            //}else{
            //// log.info('NS-Pharm inside this.timerStart');
            //    this.ReadFolderInfo();
            //}

            if (this.member.program == 'pharm_3000' || this.member.program == 'u_pharm' || this.member.program == 'e_pharm' || this.member.program == 'on_pharm') {
                this.onStartUploadFolder(response.folderIndex, 3); 
            } else if (this.member.program == 'ns_pharm' && this.option4 == 'YES') {
                this.onStartUploadFolder(response.folderIndex, 3); 
            } else if (this.member.program == 'cn_pharm' && this.option4 == 'YES') {
                this.onStartUploadFolder(response.folderIndex, 3);
            } else {
                this.ReadFolderInfo();
            }
          // this.onStartUploadFolder(response.folderIndex, 3);  //3초후에 업로드
        }
      }
      this.ReadFolderInfo();
    });

    this.electronService.ipcRenderer.on('Restart-Backup-Service', (event: Electron.IpcMessageEvent, response: any) => {
      // console.log('받음 home-page, PCRESOURCE, response = ',response);
      log.info('Restart Backup Service in an hour');
      setTimeout(this.onRetryUpload, 1000*60*60);
    });

    this.electronService.ipcRenderer.on('NSPharm-Start', (event: Electron.IpcMessageEvent, response: any) => {
      // console.log('받음 home-page, PCRESOURCE, response = ',response);
      log.info('NSPharm / CNPharm Service Start');
      this.onStartUploadFolder(0, 1);
    });

    /*---------------------------------------------------------------
           서버에 저장된 Folder의 File 목록들을 받아온다
           (초기 목록 보여주기 용)
    ----------------------------------------------------------------*/
    this.onTab(0);

    this.ReadFolderInfo();

  }

}
