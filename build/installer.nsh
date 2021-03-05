Var SystemDrive

!macro preInit
    ReadEnvStr $SystemDrive SYSTEMDRIVE
    SetRegView 64
    WriteRegExpandStr HKLM "${INSTALL_REGISTRY_KEY}" InstallLocation "$SystemDrive\PharmpaySmartBackup"
    WriteRegExpandStr HKCU "${INSTALL_REGISTRY_KEY}" InstallLocation "$SystemDrive\PharmpaySmartBackup"
    SetRegView 32
    WriteRegExpandStr HKLM "${INSTALL_REGISTRY_KEY}" InstallLocation "$SystemDrive\PharmpaySmartBackup"
    WriteRegExpandStr HKCU "${INSTALL_REGISTRY_KEY}" InstallLocation "$SystemDrive\PharmpaySmartBackup"
!macroend

!ifdef CFG_SEC_AUTORUN
    Section $(TXT_SECTION_LAUNCHWHENSYSTEMRUN)	Section_LaunchWhenSystemRun
        SectionIn ${CFG_SEC_AUTORUN_SECTIONIN}
    
        !ifndef CFG_SEC_AUTORUN_AUTORUN_PARAM
        !define CFG_SEC_AUTORUN_AUTORUN_PARAM ""
        !endif
    
        !ifdef CFG_SEC_AUTORUN_USE_REG								; 레지스트리 등록하는 방법
            WriteRegStr	${APP_AUTORUN_ROOT_KEY}  "Software\Microsoft\Windows\CurrentVersion\Run" "${APP_AUTORUN_REGNAME}" '"$INSTDIR\${APP_EXENAME}" ${CFG_SEC_AUTORUN_AUTORUN_PARAM}'
        !else											; 시작프로그램에 단축아이콘 등록하는 방법
            SetShellVarContext ${APP_AUTORUN_SHELL_VAR_CTX}					; 전체 사용자, 현재 사용자 여부 (current|all)
            CreateShortCut	"$SMSTARTUP\$(TXT_LNKNAME).lnk"	 "$INSTDIR\${APP_EXENAME} ${CFG_SEC_AUTORUN_AUTORUN_PARAM}" "" "" 0
        !endif ; CFG_SEC_AUTORUN_USE_REG
    SectionEnd
!endif ; CFG_SEC_AUTORUN
