; Инсталатор за TransitFlow NFC — четецът за гише.
;
; Компилира се с Inno Setup 6:
;     ISCC.exe installer\TransitFlow-NFC.iss
;
; Слага програмата и всичко, без което тя не тръгва на чист компютър:
; библиотеките на Microsoft, върху които стъпва Qt, и драйвера на четеца.
; И двете се инсталират тихо, без въпроси към касиера.
;
; Предварителните файлове не се пазят в хранилището — те са чужди, големи и се
; свалят от производителя. Скриптът се компилира и без тях: тогава просто не ги
; предлага. Виж README.md за откъде се вземат.

#define AppName "TransitFlow NFC"
#define AppVersion "1.0.0"
#define AppPublisher "TransitFlow"
#define AppURL "https://transitflow.org"
#define ExeName "TransitFlow-NFC.exe"

#define SourceDir "..\dist\TransitFlow-NFC"
#define IconFile "..\icon.ico"
#define VcRedist "prereq\vc_redist.x64.exe"
#define AcsDriver "prereq\acsunidrv-x64.msi"

[Setup]
AppId={{7F3C9A21-4D8E-4B2A-9E17-TRANSITFLOWNFC}
AppName={#AppName}
AppVersion={#AppVersion}
AppPublisher={#AppPublisher}
AppPublisherURL={#AppURL}
AppSupportURL={#AppURL}
DefaultDirName={autopf}\{#AppName}
DefaultGroupName={#AppName}
UninstallDisplayName={#AppName}
UninstallDisplayIcon={app}\{#ExeName}
OutputDir=.
OutputBaseFilename=TransitFlow-NFC-Setup
Compression=lzma2/max
SolidCompression=yes
WizardStyle=modern
DisableWelcomePage=no
DisableProgramGroupPage=yes
; Program Files needs administrator; the driver needs it regardless.
PrivilegesRequired=admin
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
#if FileExists(AddBackslash(SourcePath) + IconFile)
SetupIconFile={#IconFile}
#endif

[Languages]
Name: "bulgarian"; MessagesFile: "compiler:Languages\Bulgarian.isl"
Name: "english"; MessagesFile: "compiler:Default.isl"

[CustomMessages]
bulgarian.DriverTask=Драйвер за четеца (ACS)
english.DriverTask=Card reader driver (ACS)
bulgarian.DriverDesc=Нужен е, за да работи четецът. Пропуснете го само ако вече е инсталиран.
english.DriverDesc=Required for the reader to work. Skip only if it is already installed.
bulgarian.DesktopTask=Пряк път на работния плот
english.DesktopTask=Desktop shortcut
bulgarian.InstallingVc=Инсталиране на библиотеките на Microsoft…
english.InstallingVc=Installing Microsoft runtime libraries…
bulgarian.InstallingDriver=Инсталиране на драйвера за четеца…
english.InstallingDriver=Installing the card reader driver…
bulgarian.LaunchApp=Стартирай {#AppName}
english.LaunchApp=Launch {#AppName}

[Tasks]
Name: "desktopicon"; Description: "{cm:DesktopTask}"; GroupDescription: "{cm:AdditionalIcons}"
#if FileExists(AddBackslash(SourcePath) + AcsDriver)
Name: "acsdriver"; Description: "{cm:DriverTask}"; GroupDescription: "{cm:DriverDesc}"
#endif

[Files]
; The whole PyInstaller folder. Without _internal beside it the program will not
; start, so it goes in wholesale rather than file by file.
Source: "{#SourceDir}\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

#if FileExists(AddBackslash(SourcePath) + IconFile)
Source: "{#IconFile}"; DestDir: "{app}"; DestName: "icon.ico"; Flags: ignoreversion
#endif

#if FileExists(AddBackslash(SourcePath) + VcRedist)
Source: "{#VcRedist}"; DestDir: "{tmp}"; Flags: deleteafterinstall
#endif
#if FileExists(AddBackslash(SourcePath) + AcsDriver)
Source: "{#AcsDriver}"; DestDir: "{tmp}"; Flags: deleteafterinstall
#endif

[Icons]
Name: "{group}\{#AppName}"; Filename: "{app}\{#ExeName}"; IconFilename: "{app}\icon.ico"
Name: "{group}\{cm:UninstallProgram,{#AppName}}"; Filename: "{uninstallexe}"
Name: "{autodesktop}\{#AppName}"; Filename: "{app}\{#ExeName}"; IconFilename: "{app}\icon.ico"; Tasks: desktopicon

[Run]
#if FileExists(AddBackslash(SourcePath) + VcRedist)
; Qt is built against these; on a machine that has never run a Qt or Python
; program they are missing and the reader dies at startup with no message.
Filename: "{tmp}\vc_redist.x64.exe"; Parameters: "/install /quiet /norestart"; \
    StatusMsg: "{cm:InstallingVc}"; Flags: waituntilterminated
#endif
#if FileExists(AddBackslash(SourcePath) + AcsDriver)
Filename: "msiexec.exe"; Parameters: "/i ""{tmp}\acsunidrv-x64.msi"" /qn /norestart"; \
    StatusMsg: "{cm:InstallingDriver}"; Tasks: acsdriver; Flags: waituntilterminated
#endif
Filename: "{app}\{#ExeName}"; Description: "{cm:LaunchApp}"; \
    Flags: nowait postinstall skipifsilent

[UninstallDelete]
; Written beside the program while it runs, so the folder is left behind without
; this. The driver is deliberately not removed — other software may rely on it.
Type: filesandordirs; Name: "{app}\_internal"
