import { isFormattedError, ConditionalExpr } from "@angular/compiler";
import {environment} from './src/environments/environment';
import { Router } from '@angular/router';
import { Inject, Injectable } from '@angular/core';
import {LOCAL_STORAGE, StorageService} from 'ngx-webstorage-service';
import { createInjectable } from "@angular/compiler/src/core";
import { userInfo } from "os";
import { LoggerConfig } from "ngx-logger";
import * as moment from 'moment';
const {app, BrowserWindow, ipcMain} = require("electron");
const fs = require("fs");
const url = require("url");
const os = require("os");
const path = require("path");

const { localStorage, sessionStorage } = require('electron-browser-storage');

// const checkDiskSpace = require("check-disk-space");
const request = require('request');
const electron = require('electron');
const Tray = require('electron').Tray;
const Menu = require('electron').Menu;
const dialog = electron.dialog;
const log = require('electron-log');
const updater = require('electron-simple-updater');
// const { autoUpdater } = require("electron-updater")
const SF_json = require('./package.json');
//kimcy
const reqestProm = require('request-promise-native')
var AutoLaunch = require('auto-launch');
const chokidar = require('chokidar');

let isQuiting = false;
var isOpenDialog = false;
var knex = require('knex')({
  client: 'sqlite3',
  connection: {
    filename: app.getPath('userData')+'/'+ 'sb.db',
    timezone     : 'utc',   //time존 적용을 연구해야..
  }
});

var member;
const zipper = require('zip-local');
const STORAGE_URL = 'https://ssproxy.ucloudbiz.olleh.com/v1/AUTH_10b1107b-ce24-4cb4-a066-f46c53b474a3'

var AdmZip = require('adm-zip');
let stopUploadFlag = false;
let stopUploadInfo = new Object();

let backupFolder_creSoty = '';
let flagZipFileMade = false;
let flagErrorNoFile = false;

if (handleSquirrelEvent(app)) {
  // squirrel event handled and app will exit in 1000ms, so don't do anything else
  // app.exit(0); 
  // return;
}

let mainWindow;

var drBackupAutoLauncher = new AutoLaunch({
  name: 'creSotybackup'
});
drBackupAutoLauncher.enable();

/* 글로벌로 해야  garbage colllection이 안된다고함 */
let tray = null;
let contextMenu = null;

let folderOption1Path = "c:\\cresoty_backup\\option1.json";
let initOptionPath = "c:\\cresoty_backup\\init.json";

let firstInstall = false;
let program_Pharm = "";

function createWindow() {
  // console.log('createWindow');
  log.info('createWindow');
  /*---------------------------------------------------------------
               TRAY
   ----------------------------------------------------------------*/
  tray = new Tray(path.join(__dirname, '/dist/assets/icons/tray-icon.png'));
  contextMenu = Menu.buildFromTemplate([
    {
      label: '보기',
      click: function () {
        mainWindow.show();
      }
    },
    {
      label: '종료',
      click: function () {
        isQuiting = true;
        // console.log('트레이종료');
        app.quit();
      }
    }
  ]);

  tray.setToolTip(SF_json.version);
  tray.setContextMenu(contextMenu);

  tray.on('click', function (e) {
    setTimeout(function () {
      mainWindow.minimize();
    }, 3000);
  });
  contextMenu.on('menu-will-close', (event) => {
    for (let item of event.sender.items) {
      if (item.checked) log.warn("Menu item checked:", item.label)
    }
  });
 
   /*---------------------------------------------------------------
              Main Window
    ----------------------------------------------------------------*/

  mainWindow = new BrowserWindow({
    width: 800,
    height: 400,
    webPreferences: {
      nodeIntegration: true,
      webSecurity: false
    },
    autoHideMenuBar: true
  });

  mainWindow.loadURL(
    url.format({
      pathname: path.join(__dirname, `/dist/index.html`),
      protocol: "file:",
      slashes: true
    })
  );
 
   //kimcy: release 할때는 해당 부부을 false, 개발할때는 true
  function isDev() {
    return false;
  };
 
   // The following is optional and will open the DevTools:
  if (isDev()) {
    mainWindow.webContents.openDevTools();
  } else {
    //kimcy: 3초후에 사라지게 요청
    if(firstInstall){
      mainWindow.show();
    }else{
      mainWindow.hide();
      // log.warn('Hide main Window');
    }
    // setTimeout(function () {
    //   mainWindow.minimize();
    //   log.warn('MINIMIZE');
    // }, 3000);
  }
 
  app.on('before-quit', function (e) {
    // Handle menu-item or keyboard shortcut quit here
    if (isQuiting == true) {
      log.warn('before-quit ===>QUIT', isQuiting);
      mainWindow.destory();
      if(mainWindow.isDestroyed()){
        log.warn('before-quit 윈도우 종료 안됨');
      }else{
        log.warn('before-quit 윈도우 종료 ');
      }
    } else {
      log.warn('before-quit ==>HIDE', isQuiting);
    }
  });
 
  mainWindow.on('close', function (e) {
    log.warn('close ==> isQuiting?', isQuiting);
    if(mainWindow.isDestroyed()){
      log.warn('close 윈도우 종료 안됨');
    }else{
      log.warn('close 윈도우 종료 ');
    }
    if (isQuiting == true) {
      return true;
    } else {
      mainWindow.hide();
      e.preventDefault();  //여기서 이거 안하고 show 하면 문제 생김
      return false;
    }
  });
 
  mainWindow.onbeforeunload = function (e) {
    alert("onbeforeunload => 본 프로그램은 종료가 불가능합니다.")
    e.preventDefault();
    return false;
  };
    
   /*---------------------------------------------------------------
    Auto Updater
    ----------------------------------------------------------------*/
    // autoUpdater.checkForUpdates();
    // autoUpdater.on('checking-for-update', () => {
    //   log.info("checking-for-update");
    // });
    // autoUpdater.on('update-available', (info) => {
    //   log.info("update-available");
    // });
    // autoUpdater.on('update-not-available', (info) => {
    //   log.info("update-not-available");
    // });
    // autoUpdater.on('error', (err) => {
    //   log.info("error = ",err);
    // });
    // autoUpdater.on('download-progress', (progressObj) => {
    //   log.info("download-progress");
    // });
    // autoUpdater.on('update-downloaded', (info) => {
    //   log.info("update-downloaded = ",info);
      // isOpenDialog = true;
      // const dialogOpts = {
      //   title:'Application Update',
      //   message: '새 업데이트 버전이 있습니다.',
      //   type: "info"
      // }
      // dialog.showMessageBox(dialogOpts,(returnValue)=>{
      //   if(returnValue === 0) {
      //     isOpenDialog = false;
      //     autoUpdater.quitAndInstall();  
      //   }
      // });
    // });

}

function creatWarnWindow() {
  const win = new BrowserWindow({ 
    width: 400, 
    height: 300,
    webPreferences: {
      nodeIntegration: true,
      webSecurity: false
    },
    autoHideMenuBar: true
  })

  win.loadURL(
    url.format({
      pathname: path.join(__dirname, `/dist/assets/warn.html`),
      protocol: "file:",
      slashes: true
    })
  );
}

function showMainWindow(){
  mainWindow.show();
}

try {


  const gotTheLock = app.requestSingleInstanceLock()

  if (!gotTheLock) {
    app.quit()
  } else {
    app.on('second-instance', (event, commandLine, workingDirectory) => {
      // Someone tried to run a second instance, we should focus our window.
      if (mainWindow) {
        if (mainWindow.isMinimized()) mainWindow.restore()
        mainWindow.focus()
      }
    })

    app.on('ready', ()=> {
      // console.log('Ready');

      if(fs.existsSync(initOptionPath)){
        log.info('NOT First install');
        createWindow();
        createSBDatabBase();
        initDataBackup();
      }else{
        localStorage.clear();
        localStorage.removeItem('member');
        log.info('First install');
        firstInstall = true;
        let obj = {
          'first':'YES'
        };
        fs.writeFile(initOptionPath, JSON.stringify(obj,null,2), function writeJSON(err) {
          if (err) return log.error(err);
        });
        setTimeout(function(){
          createWindow();
          createSBDatabBase();
          initDataBackup();
        },2000)
      }

      if (!fs.existsSync(folderOption1Path)) {
        let obj = {
          'optionFor1Folder_IncludeSubFolder':'YES',
          'optionFor2Folder_IncludeSubFolder':'YES',
          'optionFor3Folder_IncludeSubFolder':'YES'
        };
        fs.writeFile(folderOption1Path, JSON.stringify(obj,null,2), function writeJSON(err) {
          if (err) return log.error(err);
        });
      }
    });
  }


  // Quit when all windows are closed.
  // kimcy 강제종료는 tray에서만 하는것으로??
  app.on('window-all-closed', () => {
    // On OS X it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    if (process.platform !== 'darwin') {
      log.warn('window-all-closed ==> CLOSING????', isQuiting);
      if (isQuiting == true) {
        isQuiting = false;
      } else {
        mainWindow.hide();
        isQuiting = false;
      }
  
    }
  });

  app.on('quit', ()=> {
    console.log('quit 완전종료');
    if(mainWindow.isDestroyed()){
      log.warn('quit 윈도우 종료 안됨');
     }else{
      log.warn('quit 윈도우 종료 ');
     }

  });
  //kimcy
  app.on('will-quit', () => {
    if (process.platform !== 'darwin') {
      log.warn('will-quit ==> CLOSING????', isQuiting);
      if(mainWindow.isDestroyed()){
        log.warn('will-quit 윈도우 종료 안됨');
       }else{
        log.warn('will-quit 윈도우 종료 ');
       }
  
    }
  });

  app.on('activate', () => {
    // On OS X it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (mainWindow === null) {
      createWindow();
    }
  });

} catch (e) {
  // Catch Error
  // throw e;
}

var sqlite3 = require('sqlite3').verbose();
 
function createSBDatabBase(){
  localStorage.getItem('member').then((value) => {
    member = JSON.parse(value);
    
    if (fs.existsSync(app.getPath('userData')+'/'+ 'sb.db')) {
      // console.log('exists');
    } else{
      // console.log('does not');
      var db = new sqlite3.Database(app.getPath('userData')+'/'+ 'sb.db');
      db.close();

    }

   });
  
}

function initDataBackup(){
  localStorage.getItem('data_backup').then((value) => {
    // log.info('initDataBackup => ', value);
    //log.info('initDataBackup => ', typeof value);
    if(value == undefined){
      localStorage.setItem('data_backup',"undefined").then(()=>{
        // log.info('undefine 저장');
      });
    }
  });
  
}

function createTable(tableName, window, callback){
   //console.log('createTable');

      knex.schema.hasTable(tableName).then(function(exists) {
        //log.info('createTable, exists = ',exists);
        if (!exists) {
          knex.schema.createTable(tableName, function(t) {
            t.increments('id').primary();
            t.text('filename');
            t.integer('filesize');
            t.time('fileupdate',{useTz: true}); //2019-07-25T07:02:31.587Z 저장이되어야 하느데
            t.integer('uploadstatus'); //0: 초기값(업로드해야), 1: 업로드완료 2:업데이트(아직업로드안됨, 업로드되면 1)
            t.integer('chainstatus'); //0: 초기값(업로드해야), 1: 업로드 완료, 2: 업로드에러 
           // t.string('time');
          }).then(()=>{
            //log.info('11..callback true');
            callback(true);
          }).catch(()=>{
            callback(false);
          });
        }else{
          //log.info('22..callback true');
          callback(true);
        }
      });

}

const MaxByte = 5*1024*1024*1024;
function addFileFromDir(arg, window, callback){
  //console.log('addFileFromDir => folderIndex = ', arg);
  //var tableName = arg.username+':'+arg.folderIndex;
  var tableName = arg.username;
  let config3, folderOption1;

  // 저장되어 있는 서브폴더 검색에 대한 옵션을 체크한다
  try{
    config3 = JSON.parse(fs.readFileSync(folderOption1Path));
    //log.debug('option1.json exists',config3);
    if(arg.folderIndex == 0){
      folderOption1 = config3.optionFor1Folder_IncludeSubFolder;
    }else if(arg.folderIndex == 1){
      folderOption1 = config3.optionFor2Folder_IncludeSubFolder;
    }else{
      folderOption1 = config3.optionFor3Folder_IncludeSubFolder;
    }
    if(folderOption1 == null || folderOption1 == undefined){
      folderOption1 = 'YES';
    }
  }catch(err){
    //log.debug('option1.json does NOT exist',err);
    folderOption1 = 'YES';
  }

  const watcher = chokidar.watch(arg.path, {
    ignored: /(^|[\/\\])\../, // ignore dotfiles
    persistent: true,
    //interval: 500,
    //binaryInterval: 600
  });

  let result = [];
  watcher
    .on('add', function(path, stats){
      // log.info('add path = ',path, 'stats = ',stats);
      result.push({
        fullpath: path,
        size: stats.size,
        updated: stats.mtime,
        updatedKST: stats.mtime.toLocaleString()
      })
    })
    //.on('addDir', path => log.info(`Directory ${path} has been added`))
    .on('error', ()=>{
      log.error('watcher error');
    })
    .on('ready', function() 
    { 
      log.info('Initial scan complete. Ready for changes.');
      fileSort(result);
      // log.info('result BEFORE ? = ', result);
      //log.info('tableName = ', tableName);
      
      //"pharm_3000" 팜IT3000 > "u_pharm" 유팜 > "e_pharm" 이팜
      //"on_pharm" 온팜 > "ns_pharm" NS팜 > "cn_pharm" CN팜
      // NS팜 프로그램 관련 조치 (가장 최근 mdf, ldf 파일만 zip으로 압축하여 업로드)
      if(arg.folderIndex == 0 && program_Pharm=='ns_pharm'){
        let returnList = [];
        let resultLength = result.length;

        for(let i=0;i<resultLength;i++){
          let resultElement = result[resultLength-(i+1)];
          if(resultElement.fullpath.toLowerCase().lastIndexOf('mdf')>0){
            let fileName = resultElement.fullpath;
            zipProcess(arg.path,resultElement,program_Pharm);
            let newName1 = fileName.replace('mpharm_','');
            let newName2 = newName1.replace('.mdf','.zip');
            resultElement.fullpath = newName2;
            returnList.push(resultElement);
            break;
          }
        }
        result = returnList;
      // CN팜 프로그램 관련 조치 (가장 최근 mdf, ldf 파일만 zip으로 압축하여 업로드)  
      }else if(arg.folderIndex == 0 && program_Pharm =='cn_pharm'){
        let returnList = [];
        let resultLength = result.length;

        for(let i=0;i<resultLength;i++){
          let resultElement = result[resultLength-(i+1)];
          if(resultElement.fullpath.toLowerCase().lastIndexOf('dmp')>0){
            let fileName = resultElement.fullpath;
            zipProcess(arg.path,resultElement,program_Pharm);
            let newName1 = fileName.replace('DB_','');
            let newName2 = newName1.replace('.DMP','.zip');

            resultElement.fullpath = newName2;
            returnList.push(resultElement);
            break;
          }
        }
        result = returnList;
      }else if(arg.folderIndex == 0 && program_Pharm =='u_pharm'){
        let returnList = [];
        let resultLength = result.length;

        for(let i=0;i<resultLength;i++){
          let resultElement = result[resultLength-(i+1)];
          if(resultElement.fullpath.toLowerCase().lastIndexOf('bak')>0){
            let fileName = resultElement.fullpath;
            zipProcess(arg.path,resultElement,program_Pharm);
            let newName1 = resultElement.updated;
            let newName2 = formatDate(newName1);
            let newName3 = arg.path + '/' + newName2 + '.zip';

            resultElement.fullpath = newName3;
            returnList.push(resultElement);
            break;
          }
        }
        result = returnList;
      }

      // log.info('result AFTER ? = ', result);

      var  async = require("async");
      async.eachSeries(result, function(item, next) {
        //log.info('item in addFileFromDir',item);

        let numberOfOriginalFolder = (arg.path.match(/\\/g) || []).length + 1;
        if(
          // npki 라는 경로가 있으면서 .zip이 아닌 파일은 업로드 하지 않는다
          (item.fullpath.toLowerCase().lastIndexOf('npki') > 0 && item.fullpath.lastIndexOf('.zip') < 0)
          // 만약 optionFor3Folder_IncludeSubFolder의 값이 no라면, 특정 폴더의 하위 폴더는 업로드 하지 않는다
          || (folderOption1.toLowerCase() == 'no' && ((item.fullpath.match(/\\/g) || []).length)>numberOfOriginalFolder) 
        ){
          // 어떤 동작없이 리스트의 다음으로 넘어가는 부분  
          localStorage.getItem('member').then((value) => {
             if(value != null){
              next();
             }
          });
        }else{
          knex(tableName)
          .where('filename', item.fullpath)
          .then((results)=>{
            if(results.length == 0 ){
              //log.info('22..일치하는 값 없음 = results = ', results);
              //5g이상은 업로드로 처리
              if(item.size >= MaxByte){
                  knex(tableName)
                .insert({filename: item.fullpath, filesize : item.size, 
                  fileupdate: item.updated, uploadstatus: 1, chainstatus: 1})
                .then(()=>{
                  localStorage.getItem('member').then((value) => {
                    if(value != null){
                    next();
                    }
                  });
                });
              }else{
                // zip 예측크기에 따라 wait time을 부여 (약간 주먹구구식)
                let waitTime = 0;
                if(item.size >= 500*1024*1024 && item.fullpath.lastIndexOf('.zip') > 0){
                  waitTime = 1000*60*5;
                }else if(item.size >= 200*1024*1024 && item.fullpath.lastIndexOf('.zip') > 0){
                  waitTime = 1000*60*2;
                }
                setTimeout(()=>{
                    knex(tableName)
                    .insert({filename: item.fullpath, filesize : item.size, 
                      fileupdate: item.updated, uploadstatus: 0, chainstatus: 0})
                    .then(()=>{
                      localStorage.getItem('member').then((value) => {
                        if(value != null){
                        next();
                        }
                      });
                    })
                  }, waitTime);
                // knex(tableName)
                // .insert({filename: item.fullpath, filesize : item.size, 
                //   fileupdate: item.updated, uploadstatus: 0, chainstatus: 0})
                // .then(()=>{
                //   localStorage.getItem('member').then((value) => {
                //     if(value != null){
                //      next();
                //     }
                //   });
                // });
              }
              
            }else{
              
              //log.info('업데이트 준비, results = ', results );
              for(var i =0; i< results.length; i++){

                var id = results[i]['id'];
                var fsize = results[i]['filesize'];
                var fupdate = results[i]['fileupdate']; //utc값으로 기록안되어 추후구현
                var uploadstatus = results[i]['uploadstatus'];
                var chainstatus = results[i]['chainstatus'];

                //log.info('변경 fsize = ', fsize , '현재 item = ',item);
                if(fsize != item.size){
                  if(uploadstatus == 0){
                    //log.info('업로드 전, 파일변경 = ', item.fullpath);
                    knex(tableName)
                    .where({id: id})
                    .update({filesize: item.size}).then((result)=>{
                        //log.info('결과 = ',result);
                      });
                  }else if(uploadstatus == 1 && (chainstatus == 2 || chainstatus == 0)){
                    //log.info('업로드 완료, 블록체인 실패, 파일변경 = ', item.fullpath, '체인은 = ',chainstatus);
                    if(item.size < MaxByte){
                    knex(tableName)
                    .where({id: id})
                    .update({filesize: item.size, fileupdate: item.update
                      , uploadstatus: 2, chainstatus: 0}).then((result)=>{
                        //log.info('결과 = ',result);
                      });
                    }
                  } else if(uploadstatus == 1 && chainstatus == 1){
                    //log.info('업데이트목록으로, 파일변경 = ', item.fullpath);
                    if(item.size < MaxByte){
                      knex(tableName)
                      .where({id: id})
                      .update({filesize: item.size, fileupdate: item.update
                        , uploadstatus: 2, chainstatus: 0})
                      .then((result)=> {
                        //log.info('결과 = ',result);
                      });
                    }
                  }else{
                    //log.info('체크 => results = ',results, 'item = ',item);
                  }
                }

              }
             
             //변경사항 체크 완료 
              localStorage.getItem('member').then((value) => {
                if(value != null){
                  next();
                }
              });

            }
          });
        }

    }, function(err) {
      log.info("Finish scanning File List  = ", err);
      watcher.close();
      callback(true);
      result = null;
      async = null;
      })

  })

}

function createNPKIzip(selectedPath, username){
  let filename;
  var date = new Date(); 
  var year = date.getFullYear(); 
  var month = new String(date.getMonth()+1); 
  var day = new String(date.getDate()); 
  
  // 한자리수일 경우 0을 채워준다. 
  if(month.length == 1){ 
    month = "0" + month; 
  } 
  if(day.length == 1){ 
    day = "0" + day; 
  } 
  
  var toDay = year.toString() + month + day;
  filename = toDay+'-'+username+'-'+'NPKI';
  //log.info('filename = ',filename);

  var filepath = selectedPath + '/' + filename + '.zip';
  //log.info('filepath = ',filepath);
  try{
    var files = fs.readdirSync(selectedPath);
    for(var i in files) {

      if(files[i].toLowerCase().lastIndexOf('.zip') > 0){
        fs.unlinkSync(selectedPath +'/'+files[i]);
        //log.info('zip파일 삭제');
      }else{
        //console.log('zip파일 아님');
      }
      
    }
  }catch(err){
    log.error('zip파일 실패');
  }
  
  try{
    zipper.sync.zip(selectedPath).compress().save(filepath);
    //log.info('zip파일 성공');
  } catch(err){
    log.error('zip파일 압축 실패');
  }
}
 
/*-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=
 *  IPC : ADD-ZIPFILE
 -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=*/
//  ipcMain.on("ADD-ZIPFILE", (event, arg) => {

//  });
/*-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=
 *  IPC : REQ-UPDATETREE
 -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=*/
ipcMain.on("REQ-UPDATETREE", (event, arg) => {
  console.log('받음, REQ-UPDATETREE, main folderIndex = ',arg.folderIndex);
 // var tableName = arg.username+':'+arg.folderIndex;
 var tableName = arg.username;

    knex(tableName).where({
      uploadstatus: 2
    }).then((results)=>{
      log.info(' 조회 결과  = ', results);

      results.forEach(function(element){
        element.tbName = tableName;
      });

      if(mainWindow && !mainWindow.isDestroyed()){
        //log.info('보냄 CHAINTREE, main ', results);
        mainWindow.webContents.send("UPDATETREE", {tree:results});
      }
    })
});

/*-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=
 *  IPC : REQ-UPLOADTREE
 -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=*/
ipcMain.on("REQ-UPLOADTREE", (event, arg) => {
  console.log('받음, REQ-UPLOADTREE, main folderIndex = ',arg.folderIndex);
  //var tableName = arg.username+':'+arg.folderIndex;
  var tableName = arg.username;

    knex(tableName).where({
      uploadstatus: 0
    }).then((results)=>{
      results.forEach(function(element){
        element.tbName = tableName;
      });
      //log.info(' UPLOADTREE, 조회 결과  = ', results);
      if(mainWindow && !mainWindow.isDestroyed()){
        //log.info('보냄 UPLOADTREE, main ');
        mainWindow.webContents.send("UPLOADTREE", {tree:results});
      }
    })
});

/*-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=
 *  IPC : REQ-CHAINTREE
 *  모든 테이블을 뒤져야 한다.
 -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=*/
ipcMain.on("REQ-CHAINTREE", (event, arg) => {
  //console.log('받음, REQ-CHAINTREE, main folderIndex = ',arg.folderIndex);
 
 //db 테이블이 1개일때..
  var tableName = arg.username;

    knex(tableName)
    .where({uploadstatus: 1})
    .whereNot({
      chainstatus: 1   
    }).then((results)=>{

      results.forEach(function(element){
        element.tbName = tableName;
      });

      // log.info('블록체인 조회 결과  = ', results);
      if(mainWindow && !mainWindow.isDestroyed()){
        //log.info('보냄 CHAINTREE, main ', results);
        mainWindow.webContents.send("CHAINTREE", {tree:results});
      }
    })
});

/*-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=
 *  IPC : GET FILES
 -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=*/
ipcMain.on("GETFOLDERTREE", (event, arg) => {
  
  //log.info('받음, GETFOLDERTREE, arg = ',arg);
  if (arg.path == null) {  //이게 없으면 watcher동작 안함
    // console.log('arg.path == null');
    return;
  }

  //NPKI폴더 이면서 폴더2(index=1)일 경우, zip파일 생성
  if(arg.path.toLowerCase().lastIndexOf('npki') > 0 && arg.folderIndex == 1){
    //log.info('zip파일생성');
    createNPKIzip(arg.path, arg.username);
  }
 
  if(stopUploadFlag){
    log.error('클라우드 용량초과로 파일검색 중지');
    showMainWindow();
    mainWindow.webContents.send("STOP-GET-FOLDER-TREE", {limitsize:stopUploadInfo['limitsize'], currentsize:stopUploadInfo['currentsize']});
  }else{
    log.info('addFileFromDir Start');
    addFileFromDir(arg, mainWindow, (result)=>{
      log.info('Is it ready to upload = ',result);
      localStorage.getItem('member').then((value) => {
        //log.info('로그아웃 => ', value);
        if(value == null){
          return;
        }
      });

      if(mainWindow && !mainWindow.isDestroyed()){
        //log.info('GETFOLDERTREE => 전송 ');
        mainWindow.webContents.send("GETFOLDERTREE", "Complete Scanning Folder");
      }
    });
  }
  
 
});

/*-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=
 *  IPC : SEND-FILE
-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=*/
ipcMain.on("SEND-FILE", (event, arg) => {
  console.log('받음, main, SEND-FILE ');
  
  try {
    fileupload(arg);
  } catch (e) {
    log.error('SEND-FILE',e);
  }

});

/*-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=
 *  IPC : SEND-CHAINFILE
-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=*/
ipcMain.on("SEND-CHAINFILE", (event, arg) => {
  console.log('받음, main, SEND-CHAINFILE ');
  try {
    chainupload(arg);
  } catch (e) {
    log.error('에러, SEND-CHAINFILE',e);
  }
});

/*-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=
 *  IPC : ALERT
-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=*/
ipcMain.on("ALERT", (event, arg) => {
  //console.log(arg);
  //mainWindow.show();
  const response = dialog.showMessageBox(arg);
});

ipcMain.on("ALERT-URGENT", (event, arg) => {
  log.info("arg =>  ",arg);

  if(isOpenDialog == false){
    const dialogOpts = {
      title: arg.title,
      message: arg.message,
      type: "info"
    }
  
    const response = dialog.showMessageBox(dialogOpts, (result)=>{
      if(result === 0){
        localStorage.getItem('urgent').then((value)=>{
          var urgent = JSON.parse(value);
         // log.info('urgent => value = ',urgent.url);
          require('electron').shell.openExternal(urgent.url);
  
          localStorage.getItem('member').then((value) => {
            member = JSON.parse(value);
            urgentRead(member);
          });
          
        });
        
      }
    });
  }
  //mainWindow.show();
 
});

ipcMain.on("ALERT-BACKUP", (event, arg) => {
  if(isOpenDialog == false){
    const response = dialog.showMessageBox(arg, (result)=>{
      if(result === 0 ){
        localStorage.getItem('member').then((value) => {
          member = JSON.parse(value);
          noBackupRead(member);
        });
        
      }
    });
  }
  
});

/*-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=
*  Urgent-Read
-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=*/
const apiRead = "http://211.252.85.59:3000/api/v1/notice/urgent/read"
var urgentRead = function(member){

  function urgentReadCb(error, response, body){
    if (!error && response.statusCode == 200){
      log.info('urgentRead => success');
    } else{
      log.info('urgentRead => fail');
    }
  }
  var options = {  
    method: 'PUT',
    uri: apiRead, 
    headers:{
        'Content-Type': 'application/json',
        'X-Auth-Token': member.token
    },
    
    json: true    
  };

  reqestProm(options, urgentReadCb)
}

/*-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=
*  noBackupDays-Read
-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=*/
const apiBackupRead = "http://211.252.85.59:3000/api/v1/notice/nobackupdays/read"
var noBackupRead = function(member){

  function noBackupReadCb(error, response, body){
    if (!error && response.statusCode == 200){
      log.info('noBackupRead => success');
    } else{
      log.info('noBackupRead => fail');
    }
  }
  var options = {  
    method: 'PUT',
    uri: apiBackupRead, 
    headers:{
        'Content-Type': 'application/json',
        'X-Auth-Token': member.token
    },
    
    json: true    
  };

  reqestProm(options, noBackupReadCb)
}

/*-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=
 *  IPC : PC RESOURCE
 -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=*/
ipcMain.on('PCRESOURCE', (event, arg) => {

  // === START : after comparing cloud limit and size, show a window of warning
  localStorage.getItem('member').then((value) => {
    member = JSON.parse(value);

    program_Pharm = member.program;
    let limitsize = Number(member.limitsize);
    let currentsize = Number(member.currentsize);
    log.info('cloud size(Gb)', limitsize, currentsize/1000000000);
    limitsize = limitsize * 1024 * 1024 * 1024;
    if(currentsize >= limitsize){
      creatWarnWindow();
      stopUploadFlag = true;
      stopUploadInfo['limitsize'] = limitsize;
      stopUploadInfo['currentsize'] = currentsize;
    }
    //log.info('PCRESOURCE > member',member);
  });
  // === END : after comparing cloud limit and size, show a window of warning


  //console.log('받음 main, PCRESOURCE');
  let ipaddress;
  let macaddress;
  
  var interfaces = os.networkInterfaces();
  //log.info('interfaces = ',interfaces);

  let hostName = os.hostname();
  log.info('hostName =>',hostName);

  var maps = Object.keys(interfaces)
    .map(x => interfaces[x].filter(x => x.family === 'IPv4' && !x.internal)[0])
    .filter(x => x);

  //log.info('maps =>',maps);
  if(maps != null) {
    ipaddress = maps[0].address;
    // macaddress = maps[0].mac;
    macaddress = hostName;
  }

  localStorage.getItem('ipaddress').then((value) => {
    //log.info('ipaddress in localstorage => ', value);
    if(value == undefined || value == null){
      localStorage.setItem('ipaddress',ipaddress).then(()=>{
        //log.info(ipaddress,'ipaddress localstorage 저장');
      });
    }else{
      ipaddress = value;
      //log.info('ipaddress from localstorage');
    }
  });

  localStorage.getItem('macaddress').then((value) => {
    //log.info('hostName in localstorage => ', value);
    if(value == undefined || value == null){
      localStorage.setItem('macaddress',macaddress).then(()=>{
      });
    }else{
      macaddress = value;
    }
  
    if(mainWindow && !mainWindow.isDestroyed()){
      // log.info('보냄 main, PCRESOURCE',ipaddress,macaddress);
      mainWindow.webContents.send("PCRESOURCE", {
        ipaddresses: maps,
        ipaddress: ipaddress,
        macaddress: macaddress
      });
    }
  
  });

});

ipcMain.on('SELECTFOLDER', (event, arg) => {
  //console.log('받음,main, SELECTFOLDER');
  var directory = dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory']

  });


  if(mainWindow && !mainWindow.isDestroyed()){
    
    //var tableName = arg.username +':'+arg.folderIndex;
    var tableName = arg.username; 
    //db생성
    //db table 생성
    createTable(tableName, mainWindow,(result) => {
      //log.info('보냄,main, SELECTFOLDER');

      if(result){
        //log.info('result = ',result);
        mainWindow.webContents.send("SELECTFOLDER", {
          error: null,
          folderIndex: arg.folderIndex,
          directory: directory
        });
      }else{
        log.error('데이터베이스 생성 실패');
      }
      
    });
  }
});

ipcMain.on('DELETE-ZIP-FILE', (event, arg) => {

  log.info('Delete Zip files in backup folder');
  if(backupFolder_creSoty == ''){
    log.error('Not a pharm program to delete files');
  }else{

    let targetList1 = [];
    try{
      var files = fs.readdirSync(backupFolder_creSoty);
      for(var i in files) {
        if(files[i].toLowerCase().lastIndexOf('.zip') > 0){
          targetList1.push(files[i]);
        }
      }
      
      targetList1.sort(function(a, b) {
        let s11 = fs.statSync(backupFolder_creSoty +'/'+a);
        let s12 = fs.statSync(backupFolder_creSoty +'/'+b);
        let s1 = s11.ctime;
        let s2 = s12.ctime;
        if (s1 < s2) { return 1; }
        if (s1 > s2) { return -1; }
        return 0;
      });

      if(targetList1.length <= 3){
        log.error('None to delete');
      }else{
        // log.info('targetList1',targetList1);
        for(var j=3;j<targetList1.length;j++){
          // log.info('targetList1[i]',targetList1[j]);
          fs.unlinkSync(backupFolder_creSoty +'/'+targetList1[j]);
        }
        log.info('Backup 폴더 delete : Done');
      }
    }catch(err){
      log.error('Backup 폴더 지우기 실패',err);
    }

  }

});

ipcMain.on('Restart-Backup-Check', (event, arg) => {

  // log.info('Restart-Backup-Check');
  if(flagZipFileMade && flagErrorNoFile){
    if(mainWindow && !mainWindow.isDestroyed()){
      // log.info('보냄 main, PCRESOURCE',ipaddress,macaddress);
      mainWindow.webContents.send("Restart-Backup-Service",null);
    }
  }
  flagZipFileMade = false;
  flagErrorNoFile = false;
});

/*-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=
 *  chain upload
 -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=*/
var chainupload = function (arg){
  console.log('블록체인 기록을 위한 api');
  let method, url;

  //chain-error: 파일업로드는 됬지만 블록체인에 기록되지 않은 상태.
  // if(arg.uploadtype == 'chain-create' || arg.uploadtype == 'chain-error'){
  //   console.log('chain-create/ chain-error');
  //     method = 'POST';
  //     url = 'http://211.252.85.59:3000/api/v1/proof/create'; //env.CREATE;
  //     //url = env.CREATE_DEV; //개발용
  // }else{
  //   method = 'PUT';
  //   url = 'http://211.252.85.59:3000/api/v1/proof/update'; //env.UPDATE;
  //   //url = env.UPDATE_DEV;
  // }
  // log.info('chainupload, arg = ',arg);
  let tableName = arg.tablename;

  function chainuploadCb(error, response, body) {

    // if (!error && response.statusCode == 200) {
    //   log.info('체인코드 업데이트 성공');

      knex(tableName)
        .where({id: arg.fileid})
        .update({chainstatus: 1})  
        .then(()=>{
          //console.log('arg.uploadtype = ',arg.uploadtype);
          mainWindow.webContents.send(arg.uploadtype, {
            error: null,
            body: body,
            index: arg.folderIndex,
          });
        });
      
    // }else{
    //    log.error('chain응답 실패 = ',error, 'info = ',arg); 
    //    //log.error('tableName = ',tableName);
    //    knex(tableName)
    //     .where({id: arg.fileid})
    //     .update({uploadstatus: 1, chainstatus: 2})  
    //     .then(()=>{
    //       //console.log('arg.uploadtype = ',arg.uploadtype);
    //       if (mainWindow && !mainWindow.isDestroyed()){
    //         mainWindow.webContents.send(arg.uploadtype, {error: "chain-error", body:body});
    //       }
    //     });
    // }
  }

  var options = {  
    method: method,
    uri: url, 
    headers:{
        'Content-Type': 'application/json',
        'X-Auth-Token': arg.token
    },
    body:{
      'id': arg.container , 
      'file': arg.filename   
    },
    json: true    //이거 꼭 필요함. 안그러면 body argument error발생
  };


  reqestProm(options, chainuploadCb)

}

/*-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=
 *  FILE을 KT 스토리지에 저장하고 db에 기록
 *  KT Storage 서버에 사용자 키를 가져오고 저장한다. promise로 구현
 *  container명은 로그인시 id로...
 -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=*/
var fileupload = function (arg){

  var upload = null;
  var r = null;

  let startTime = new Date().getTime();
  //let tableName = arg.container+':'+arg.folderIndex;
  // log.info('fileupload, arg = ',arg);
  let tableName = arg.tablename;

  //kimcy error kt에서 응답이 null이 나와서 수정
  function fileuploadCb(error, response, body) {
    //log.debug('fileuploadCb => error : ',error);
    //log.debug('fileuploadCb => response : ',response);

    if(!error && (response != null || response != undefined)){
     if(response.statusCode == 201){
        console.log('업로드 성공');
        upload = null;
        r = null;
        
        var bkzip = arg.data_backup;
        // console.log('bkzip = ', bkzip);
        if(bkzip != 'not-store'){
          localStorage.setItem('data_backup',bkzip).then(()=>{
            console.log('zip저장');
          });
        }

        knex(tableName)
        .where({id: arg.fileid})
        .update('uploadstatus', 1)
        .then(()=>{
          if(mainWindow && !mainWindow.isDestroyed()){
            //console.log('업로드후 db쓰기 완료 다음파일 주세요');
            mainWindow.webContents.send(arg.uploadtype, {
              error: null,
              body: body,
              index: arg.folderIndex,
              startTime: startTime,
              endTime: new Date().getTime(),
            // data_backup: arg.data_backup
            });
          }
        }).catch(function(error){
          log.error('knex 에러 = ',error);
        });
     }else{
      log.error('11..업로드 실패, error = ',error, 'status = ', response.statusCode, 'info = ',arg);
      upload = null;
      r = null;
      if (mainWindow && !mainWindow.isDestroyed()){
        mainWindow.webContents.send(arg.uploadtype, {error: response.statusCode});
      }
     }
      
    }else{
      log.error('22..업로드 실패, error = ',error, 'info = ',arg);
      upload = null;
      r = null;
      if (mainWindow && !mainWindow.isDestroyed()){
        mainWindow.webContents.send(arg.uploadtype, {error: "000"});
      }
    }
  }

  var options = {  
    method: 'PUT',
    uri: STORAGE_URL+'/'+arg.container+'/'+ encodeURI(arg.filename), 
    headers:{
        'X-Auth-Token': arg.token,
        'X-Object-Meta-ctime': startTime
    }
  };

  try{
    if(fs.existsSync(arg.filepath)){
      //파일이 존재함으로 업로드..
      upload = fs.createReadStream(arg.filepath,{highWaterMark : 256*1024});
      r = reqestProm(options, fileuploadCb);
      upload.pipe(r);
    }else{
      //db목록에서 삭제
      log.info('파일없음으로 db목록에서 삭제: ',arg.filepath);
      flagErrorNoFile = true;
      knex(tableName)
        .where({id: arg.fileid})
        .del().then(()=>{
          if (mainWindow && !mainWindow.isDestroyed()){
            mainWindow.webContents.send(arg.uploadtype, {error: "1010"}); 
          }
        });
    }
  } catch(err){
    log.error('업로드 에러 : ',err);
  }
}

function handleSquirrelEvent(application) {
  if (process.argv.length === 1) {
    return false;
  }

  const ChildProcess = require("child_process");
  const path = require("path");

  const appFolder = path.resolve(process.execPath, '..');
  const rootAtomFolder = path.resolve(appFolder, '..');
  const updateDotExe = path.resolve(path.join(rootAtomFolder, 'Update.exe'));
  const exeName = path.basename(process.execPath);

  const spawn = function (command, args) {
    let spawnedProcess, error;

    try {
      spawnedProcess = ChildProcess.spawn(command, args, {
        detached: true
      });
    } catch (error) {
    }

    return spawnedProcess;
  };

  const spawnUpdate = function (args) {
    return spawn(updateDotExe, args);
  };

  const squirrelEvent = process.argv[1];
  switch (squirrelEvent) {
    case '--squirrel-install':
      localStorage.clear();
      localStorage.removeItem('member');
      log.info('Squirrel installed First');

    case '--squirrel-updated':
      // Optionally do things such as:
      // - Add your .exe to the PATH
      // - Write to the registry for things like file associations and
      //   explorer context menus

      // Install desktop and start menu shortcuts
      spawnUpdate(['--createShortcut', exeName]);

      setTimeout(application.quit, 1000);
      return true;

    case '--squirrel-uninstall':
      // Undo anything you did in the --squirrel-install and
      // --squirrel-updated handlers
      localStorage.clear();
      localStorage.removeItem('member');
      log.info('Squirrel uninstall');
      // Remove desktop and start menu shortcuts
      spawnUpdate(['--removeShortcut', exeName]);

      setTimeout(application.quit, 1000);
      return true;

    case '--squirrel-obsolete':
      // This is called on the outgoing version of your app before
      // we update to the new version - it's the opposite of
      // --squirrel-updated

      application.quit();
      return true;
  }
};

function createZipPharm(selectedPath, program_Pharm){

  let targetList1 = [];
  try{
    var files = fs.readdirSync(selectedPath);
    for(var i in files) {
      if(files[i].toLowerCase().lastIndexOf('.mdf') > 0){
        targetList1.push(files[i]);
      }
    }
    // 파일리스트 최신순으로 정렬
    targetList1.sort(function(a, b) {
      let aLocation = a.toLowerCase().lastIndexOf('_');
      let s1 = Number(a.substr(aLocation+1,10));
      let bLocation = b.toLowerCase().lastIndexOf('_');
      let s2 = Number(b.substr(bLocation+1,10));
      if (s1 < s2) { return 1; }
      if (s1 > s2) { return -1; }
      return 0;
    });
  }catch(err){
    log.error('Backup 폴더정보 읽기 실패');
  }
  
  let transferList = [];
  // if(firstInstall){
    transferList = targetList1.slice(0,3);
  // }else{
  //   transferList = targetList1.slice(0,1);
  // }
  // zipper.sync.zip(selectedPath).compress().save(filepath);
  // log.info('zip파일 시작 11',firstInstall);
  zipProcess(selectedPath,transferList,program_Pharm);
  
}

function zipProcess(selectedPath,resultElement,program_Pharm){
  
  flagZipFileMade = true;
  // log.info('zip파일 시작 22',targetList1);
  let fileName = resultElement.fullpath;
  let filepath, target1, target2;
  backupFolder_creSoty = selectedPath;

  if(program_Pharm =='ns_pharm'){
    let targetFile = fileName;
    let a_Location = targetFile.toLowerCase().lastIndexOf('_');
    let s1 = targetFile.substr(a_Location+1,10);

    filepath = selectedPath + '/' + s1 + ".zip";
    target1 = targetFile;
    target2 = target1.replace('.mdf','.ldf');

  }else if(program_Pharm == 'cn_pharm'){
    let targetFile = fileName;
    let a_Location = targetFile.toLowerCase().lastIndexOf('_');
    let s1 = targetFile.substr(a_Location+1,10);

    filepath = selectedPath + '/' + s1 + ".zip";
    target1 = targetFile;
    let target11 = target1.replace('.DMP','.sql');
    target2 = target11.replace('DB','MariaDB');

  }else if(program_Pharm == 'u_pharm'){
    let splitFullPath = fileName.split('\\');
    let splitFullPathLength = splitFullPath.length;
    let targetFolder = splitFullPath[splitFullPathLength-2];

    target1 = selectedPath + '/' + targetFolder;
    let newName1 = resultElement.updated;
    let newName2 = formatDate(newName1);
    filepath = selectedPath + '/' + newName2 + '.zip'; 
  }

  try{
    if (!fs.existsSync(filepath)) { 
      var zip = new AdmZip();
      if(program_Pharm == 'cn_pharm' || program_Pharm =='ns_pharm'){
        if(program_Pharm == 'cn_pharm'){
          let newTarget2 = target2.replace('sql','SQL');
          if(fs.existsSync(target2)){
            zip.addLocalFile(target1);
            zip.addLocalFile(target2);
            zip.writeZip(filepath);
          }else if(fs.existsSync(newTarget2)){
            zip.addLocalFile(target1);
            zip.addLocalFile(newTarget2);
            zip.writeZip(filepath);
          }else{
            zip.addLocalFile(target1);
            zip.writeZip(filepath);
          }
        }
        if(program_Pharm == 'ns_pharm'){
          let newTarget2 = target2.replace('ldf','LDF');
          if(fs.existsSync(target2)){
            zip.addLocalFile(target1);
            zip.addLocalFile(target2);
            zip.writeZip(filepath);
          }else if(fs.existsSync(newTarget2)){
            zip.addLocalFile(target1);
            zip.addLocalFile(newTarget2);
            zip.writeZip(filepath);
          }else{
            zip.addLocalFile(target1);
            zip.writeZip(filepath);
          }
        }
      }else if(program_Pharm == 'u_pharm'){
        zipper.sync.zip(target1).compress().save(filepath);
      }
    } 
  }catch(e){
    log.info('error in zip process',e);
  }
}

function formatDate(date) {
  var d = new Date(date),
      month = '' + (d.getMonth() + 1),
      day = '' + d.getDate(),
      year = d.getFullYear();

  if (month.length < 2) 
      month = '0' + month;
  if (day.length < 2) 
      day = '0' + day;

  return [year, month, day].join('-');
}

function fileSort(targetList){
  targetList.sort(function(a, b) {
    // let a = a.toLowerCase().lastIndexOf('_');
    let s1 = a.updated;
    // let bLocation = b.toLowerCase().lastIndexOf('_');
    let s2 = b.updated;
    if (s1 < s2) { return -1; }
    if (s1 > s2) { return 1; }
    return 0;
  });
}
