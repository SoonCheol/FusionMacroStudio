Fusion Macro Studio Add-in Setup 0.2.0 (Windows preview)
1. Extract the entire ZIP. Close Fusion and run Setup.cmd.
2. Install/update the independent add-in. Start Fusion.
3. In the web editor, save fusion-macro-profile.json after writing the keypad.
4. Import the JSON through Setup. The add-in reloads the mapping locally.
5. For original icons, click Export Fusion command list / local icons while Fusion is running. Open the local data folder, then import export/commands.json and export/icons in the browser. Native command resources may not be accessible.
Only mapped F13-F24 combinations are intercepted while the Fusion process is foreground. The hook cannot distinguish another keyboard emitting the same combination. Long press uses >=500 ms from key down to key up; the physical keypad must emit true held key signals. Escape-equivalent uses terminateActiveCommand. No firmware changes. Test on one unused key first. No DeckForge data is touched. No upload or server.
To uninstall, close Fusion and run Setup. Profile remains.
