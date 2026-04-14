tell application "Ableton Live 12 Suite" to activate

tell application "System Events"
  tell process "Live"
    try
      click menu item "Save Live Set" of menu "File" of menu bar 1
      return "clicked Save Live Set"
    on error errMsg1
      try
        click menu item "Save Set" of menu "File" of menu bar 1
        return "clicked Save Set"
      on error errMsg2
        try
          keystroke "s" using command down
          return "sent cmd-s"
        on error errMsg3
          return "failed: " & errMsg1 & " | " & errMsg2 & " | " & errMsg3
        end try
      end try
    end try
  end tell
end tell
