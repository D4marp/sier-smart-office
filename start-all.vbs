' Menjalankan start-all.bat secara tersembunyi (tanpa jendela console).
Set WshShell = CreateObject("WScript.Shell")
scriptDir = CreateObject("Scripting.FileSystemObject").GetParentFolderName(WScript.ScriptFullName)
WshShell.Run """" & scriptDir & "\start-all.bat""", 0, False
