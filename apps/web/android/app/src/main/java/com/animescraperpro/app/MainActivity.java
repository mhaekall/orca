package com.animescraperpro.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // Capacitor v3+ automatically registers plugins from package.json
        // No manual registration needed here for @codetrix-studio/capacitor-google-auth
    }
}
