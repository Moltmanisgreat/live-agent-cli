on run argv
  if (count of argv) is less than 1 then error "Expected target path"
  set targetPath to item 1 of argv
  set AppleScript's text item delimiters to "/"
  set pathItems to text items of targetPath
  if (count of pathItems) < 2 then error "Expected absolute target path"
  set targetName to item -1 of pathItems
  set targetDir to text 1 thru ((length of targetPath) - (length of targetName) - 1) of targetPath

  tell application "Ableton Live 12 Suite" to activate
  delay 1
  tell application "System Events"
    tell process "Live"
      set frontmost to true
      click menu item "Save Live Set As..." of menu "File" of menu bar 1
      delay 1.5
      keystroke "g" using {command down, shift down}
      delay 0.5
      keystroke targetDir
      delay 0.3
      key code 36
      delay 1.0
      keystroke targetName
      delay 0.5
      key code 36
      delay 1.0
      return "attempted Save Live Set As to " & targetPath
    end tell
  end tell
end run
