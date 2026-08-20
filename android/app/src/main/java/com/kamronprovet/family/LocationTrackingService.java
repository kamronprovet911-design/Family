package com.kamronprovet.family;

import android.Manifest;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.location.Location;
import android.location.LocationListener;
import android.location.LocationManager;
import android.os.IBinder;
import androidx.core.app.ActivityCompat;
import androidx.core.app.NotificationCompat;
import org.json.JSONObject;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;
import java.util.TimeZone;
import java.util.concurrent.Executors;

public class LocationTrackingService extends Service implements LocationListener {
  private static final int NOTIFICATION_ID = 3301;
  private LocationManager locationManager;
  private String supabaseUrl, anonKey, accessToken, userId;

  @Override public void onCreate() { super.onCreate(); createChannel(); }
  @Override public int onStartCommand(Intent intent, int flags, int startId) {
    supabaseUrl = intent.getStringExtra("supabaseUrl"); anonKey = intent.getStringExtra("anonKey"); accessToken = intent.getStringExtra("accessToken"); userId = intent.getStringExtra("userId");
    Notification notification = new NotificationCompat.Builder(this, "family_location").setSmallIcon(android.R.drawable.ic_menu_mylocation).setContentTitle("Моя семья").setContentText("Передача геолокации активна").setOngoing(true).build();
    startForeground(NOTIFICATION_ID, notification);
    if (ActivityCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED) return START_NOT_STICKY;
    locationManager = (LocationManager) getSystemService(Context.LOCATION_SERVICE);
    locationManager.requestLocationUpdates(LocationManager.GPS_PROVIDER, 30_000L, 0f, this);
    locationManager.requestLocationUpdates(LocationManager.NETWORK_PROVIDER, 30_000L, 0f, this);
    return START_STICKY;
  }
  @Override public void onLocationChanged(Location location) { send(location); }
  private void send(Location location) { Executors.newSingleThreadExecutor().execute(() -> { try {
    URL url = new URL(supabaseUrl + "/rest/v1/locations?on_conflict=user_id"); HttpURLConnection connection = (HttpURLConnection) url.openConnection(); connection.setRequestMethod("POST"); connection.setDoOutput(true); connection.setRequestProperty("Content-Type", "application/json"); connection.setRequestProperty("apikey", anonKey); connection.setRequestProperty("Authorization", "Bearer " + accessToken); connection.setRequestProperty("Prefer", "resolution=merge-duplicates,return=minimal");
    SimpleDateFormat format = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US); format.setTimeZone(TimeZone.getTimeZone("UTC")); JSONObject body = new JSONObject(); body.put("user_id", userId); body.put("latitude", location.getLatitude()); body.put("longitude", location.getLongitude()); body.put("accuracy", location.getAccuracy()); body.put("updated_at", format.format(new Date()));
    try (OutputStream output = connection.getOutputStream()) { output.write(body.toString().getBytes(StandardCharsets.UTF_8)); } connection.getResponseCode(); connection.disconnect();
  } catch (Exception ignored) {} }); }
  private void createChannel() { NotificationChannel channel = new NotificationChannel("family_location", "Геолокация семьи", NotificationManager.IMPORTANCE_LOW); ((NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE)).createNotificationChannel(channel); }
  @Override public void onDestroy() { if (locationManager != null) locationManager.removeUpdates(this); super.onDestroy(); }
  @Override public IBinder onBind(Intent intent) { return null; }
}
