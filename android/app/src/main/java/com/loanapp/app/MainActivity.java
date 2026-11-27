package com.loanapp.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Local plugins must be registered before the bridge boots.
        registerPlugin(ApkUpdaterPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
