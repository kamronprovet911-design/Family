package com.kamronprovet.family;

import com.getcapacitor.BridgeActivity;

import com.kamronprovet.family.BackgroundLocationPlugin;

public class MainActivity extends BridgeActivity {
  @Override
  public void onCreate(android.os.Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    registerPlugin(BackgroundLocationPlugin.class);
  }
}
