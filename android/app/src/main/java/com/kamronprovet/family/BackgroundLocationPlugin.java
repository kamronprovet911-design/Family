package com.kamronprovet.family;

import android.content.Context;
import android.content.Intent;
import androidx.core.content.ContextCompat;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;

@CapacitorPlugin(name = "BackgroundLocation")
public class BackgroundLocationPlugin extends Plugin {
  @PluginMethod
  public void start(PluginCall call) {
    Intent intent = new Intent(getContext(), LocationTrackingService.class);
    intent.putExtra("supabaseUrl", call.getString("supabaseUrl"));
    intent.putExtra("anonKey", call.getString("anonKey"));
    intent.putExtra("accessToken", call.getString("accessToken"));
    intent.putExtra("userId", call.getString("userId"));
    ContextCompat.startForegroundService(getContext(), intent);
    call.resolve();
  }

  @PluginMethod
  public void stop(PluginCall call) {
    getContext().stopService(new Intent(getContext(), LocationTrackingService.class));
    call.resolve();
  }
}
