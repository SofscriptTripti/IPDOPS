package com.ipdops;

import android.app.Activity;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.ContentValues;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.os.ParcelFileDescriptor;
import android.print.PageRange;
import android.print.PrintAttributes;
import android.print.PrintDocumentAdapter;
import android.print.PrintDocumentInfo;
import android.provider.MediaStore;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import androidx.core.app.NotificationCompat;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.UiThreadUtil;
import java.io.File;

public class PdfModule extends ReactContextBaseJavaModule {
    private final ReactApplicationContext reactContext;

    public PdfModule(ReactApplicationContext reactContext) {
        super(reactContext);
        this.reactContext = reactContext;
    }

    @Override
    public String getName() {
        return "PdfModule";
    }

    @ReactMethod
    public void printHTML(final String htmlString, final String jobName) {
        UiThreadUtil.runOnUiThread(new Runnable() {
            @Override
            public void run() {
                final Activity activity = getCurrentActivity();
                if (activity == null) return;

                final WebView webView = new WebView(activity);
                webView.setWebViewClient(new WebViewClient() {
                    @Override
                    public void onPageFinished(WebView view, String url) {
                        final PrintDocumentAdapter printAdapter = webView.createPrintDocumentAdapter(jobName);
                        PrintAttributes printAttributes = new PrintAttributes.Builder()
                                .setMediaSize(PrintAttributes.MediaSize.ISO_A4)
                                .setResolution(new PrintAttributes.Resolution("pdf", "pdf", 300, 300))
                                .setMinMargins(PrintAttributes.Margins.NO_MARGINS)
                                .build();

                        try {
                            final String fileName = jobName + "_" + System.currentTimeMillis() + ".pdf";
                            final Uri pdfUri;
                            final ParcelFileDescriptor pfd;

                            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                                ContentValues contentValues = new ContentValues();
                                contentValues.put(MediaStore.MediaColumns.DISPLAY_NAME, fileName);
                                contentValues.put(MediaStore.MediaColumns.MIME_TYPE, "application/pdf");
                                contentValues.put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS);
                                contentValues.put(MediaStore.MediaColumns.IS_PENDING, 1);

                                Uri externalUri = MediaStore.Downloads.EXTERNAL_CONTENT_URI;
                                pdfUri = reactContext.getContentResolver().insert(externalUri, contentValues);
                                if (pdfUri != null) {
                                    pfd = reactContext.getContentResolver().openFileDescriptor(pdfUri, "rw");
                                } else {
                                    pfd = null;
                                }
                            } else {
                                File downloadsDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS);
                                File file = new File(downloadsDir, fileName);
                                pdfUri = androidx.core.content.FileProvider.getUriForFile(reactContext, reactContext.getPackageName() + ".provider", file);
                                pfd = ParcelFileDescriptor.open(file, ParcelFileDescriptor.MODE_READ_WRITE | ParcelFileDescriptor.MODE_CREATE | ParcelFileDescriptor.MODE_TRUNCATE);
                            }

                            if (pfd != null && pdfUri != null) {
                                final ParcelFileDescriptor finalPfd = pfd;
                                final Uri finalUri = pdfUri;
                                android.print.PdfPrintHelper.printAdapterToFile(printAdapter, printAttributes, finalPfd, new android.print.PdfPrintHelper.PdfCallback() {
                                    @Override
                                    public void onSuccess() {
                                        try {
                                            finalPfd.close();
                                            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                                                ContentValues contentValues = new ContentValues();
                                                contentValues.put(MediaStore.MediaColumns.IS_PENDING, 0);
                                                reactContext.getContentResolver().update(finalUri, contentValues, null, null);
                                            }
                                            showDownloadNotification(fileName, finalUri);
                                        } catch (Exception e) {
                                            e.printStackTrace();
                                        }
                                    }

                                    @Override
                                    public void onFailure(Exception e) {
                                        e.printStackTrace();
                                    }
                                });
                            }
                        } catch (Exception e) {
                            e.printStackTrace();
                        }
                    }
                });
                webView.loadDataWithBaseURL(null, htmlString, "text/html", "utf-8", null);
            }
        });
    }

    private void showDownloadNotification(String fileName, Uri fileUri) {
        Context context = reactContext.getApplicationContext();
        NotificationManager notificationManager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        String channelId = "pdf_download_channel";

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(channelId, "PDF Downloads", NotificationManager.IMPORTANCE_HIGH);
            channel.setDescription("Notifications for downloaded PDF files");
            notificationManager.createNotificationChannel(channel);
        }

        Intent intent = new Intent(Intent.ACTION_VIEW);
        intent.setDataAndType(fileUri, "application/pdf");
        intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_GRANT_READ_URI_PERMISSION);

        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            flags |= PendingIntent.FLAG_IMMUTABLE;
        }

        PendingIntent pendingIntent = PendingIntent.getActivity(
                context,
                0,
                intent,
                flags
        );

        NotificationCompat.Builder builder = new NotificationCompat.Builder(context, channelId)
                .setContentTitle("File Downloaded")
                .setContentText(fileName + " has been saved to your Downloads folder.")
                .setSmallIcon(android.R.drawable.stat_sys_download_done)
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setAutoCancel(true)
                .setContentIntent(pendingIntent);

        notificationManager.notify((int) System.currentTimeMillis(), builder.build());
    }
}
