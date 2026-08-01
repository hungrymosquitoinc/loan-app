# Capacitor / WebView bridge — R8 must keep these (invoked via reflection)
-keep class com.getcapacitor.** { *; }
-keep class com.getcapacitor.plugin.** { *; }
-keep class com.getcapacitor.cordova.** { *; }
-keep class com.loanapp.app.MainActivity { *; }

# Capacitor Bridge / JS interface used through reflection
-keepclassmembers class * {
    @com.getcapacitor.annotation.CapacitorPlugin *;
}
-keep class * extends com.getcapacitor.Plugin { *; }

# Remove debug metadata
-renamesourcefileattribute SourceFile
-keepattributes !SourceFile, !LineNumberTable
