package android.print;

import android.os.ParcelFileDescriptor;
import android.print.PageRange;
import android.print.PrintAttributes;
import android.print.PrintDocumentAdapter;
import android.print.PrintDocumentInfo;

public class PdfPrintHelper {
    public interface PdfCallback {
        void onSuccess();
        void onFailure(Exception e);
    }

    public static void printAdapterToFile(
        final PrintDocumentAdapter adapter,
        final PrintAttributes attributes,
        final ParcelFileDescriptor pfd,
        final PdfCallback callback
    ) {
        adapter.onLayout(null, attributes, null, new PrintDocumentAdapter.LayoutResultCallback() {
            @Override
            public void onLayoutFinished(PrintDocumentInfo info, boolean changed) {
                adapter.onWrite(new PageRange[]{PageRange.ALL_PAGES}, pfd, null, new PrintDocumentAdapter.WriteResultCallback() {
                    @Override
                    public void onWriteFinished(PageRange[] pages) {
                        callback.onSuccess();
                    }

                    @Override
                    public void onWriteFailed(CharSequence error) {
                        callback.onFailure(new Exception(error != null ? error.toString() : "Unknown write error"));
                    }
                });
            }

            @Override
            public void onLayoutFailed(CharSequence error) {
                callback.onFailure(new Exception(error != null ? error.toString() : "Unknown layout error"));
            }
        }, null);
    }
}
