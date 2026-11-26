Fusion Macro Studio Add-in Setup 0.3.12 (Windows preview)
1. Extract the entire ZIP. Close Fusion and run Setup.cmd.
2. Install/update the independent add-in. Start Fusion.
3. In the web editor, save fusion-macro-profile.json after writing the keypad.
4. Import the JSON through Setup. The add-in reloads the mapping locally.
5. For original icons, click Export Fusion command list / local icons while Fusion is running. Open the local data folder, then import export/commands.json and export/icons in the browser. Native command resources may not be accessible.
Only mapped F13-F24 combinations are intercepted while the Fusion process is foreground. The hook cannot distinguish another keyboard emitting the same combination. Long press sends one Escape-equivalent after 500 ms while held (or on release if the threshold was reached before polling); the physical keypad must emit true held key signals. Escape-equivalent uses terminateActiveCommand. No firmware changes. Test on one unused key first. No DeckForge data is touched. No upload or server.
To uninstall, close Fusion and run Setup. Profile remains.

The installer validates the profile's Fusion mappings against their actual F13-F24 trigger bindings before replacing profile.json. Running status distinguishes saved, loaded and invalid profiles. Export status is local and reports completion or error. Updates stage the package outside AddIns, retain the previous add-in directory outside AddIns, and restore it if replacement fails. Windows/Fusion execution remains unverified.
\nZoom uses current orthographic camera extents or perspective eye distance. Orbit steps are 7 degrees and zoom factor is 0.85, provisional until hardware testing. Pending input is discarded on profile change, focus loss detected during polling, or after 1.5 seconds.\n