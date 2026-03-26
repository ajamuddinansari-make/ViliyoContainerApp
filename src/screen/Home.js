import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  BackHandler,
  ToastAndroid,
  Animated,
  Easing,
  PermissionsAndroid,
  Platform,
  StatusBar,
  AppState,
  ActivityIndicator,
  View,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { SafeAreaView } from 'react-native-safe-area-context';
import Orientation from 'react-native-orientation-locker';
import KeepAwake from 'react-native-keep-awake';

const HOME_URL = 'https://learner.viliyo.com/dashboard';
const MOBILE_TOKEN = "210303120209";

const Home = () => {
  const webViewRef = useRef(null);
  const progress = useRef(new Animated.Value(0)).current;
  const scrollTimeoutRef = useRef(null);
  const orientationTimeoutRef = useRef(null);
  const appStateRef = useRef(AppState.currentState);
  const officeLoadTimeoutRef = useRef(null);

  const [currentUrl, setCurrentUrl] = useState(`${HOME_URL}?mobiletoken=${MOBILE_TOKEN}`);
  const [canGoBack, setCanGoBack] = useState(false);
  const [backPressCount, setBackPressCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isLivePage, setIsLivePage] = useState(false);
  const [isOfficeViewer, setIsOfficeViewer] = useState(false);
  const [officeLoading, setOfficeLoading] = useState(false);
  const [webViewKey, setWebViewKey] = useState(0); 

  useEffect(() => {
    if (Platform.OS === 'android') {
      PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.CAMERA,
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
      ]);
    }
  }, []);

 
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (appStateRef.current.match(/inactive|background/) && nextAppState === 'active') {
      
        if (isOfficeViewer && webViewRef.current) {
          setTimeout(() => {
            webViewRef.current?.reload();
          }, 100);
        }
      }
      appStateRef.current = nextAppState;
    });

    return () => subscription.remove();
  }, [isOfficeViewer]);

 
  useEffect(() => {
    return () => {
      if (officeLoadTimeoutRef.current) {
        clearTimeout(officeLoadTimeoutRef.current);
      }
      if (orientationTimeoutRef.current) {
        clearTimeout(orientationTimeoutRef.current);
      }
    };
  }, []);

  const handleBackPress = useCallback(() => {
    if (isOfficeViewer && webViewRef.current) {
      webViewRef.current.goBack();
      return true;
    }
    
    if (canGoBack && webViewRef.current) {
      webViewRef.current.goBack();
      return true;
    }
    
    if (backPressCount === 0) {
      setBackPressCount(1);
      ToastAndroid.show('Press back again to exit', ToastAndroid.SHORT);
      setTimeout(() => setBackPressCount(0), 2000);
      return true;
    }
    BackHandler.exitApp();
    return true;
  }, [canGoBack, backPressCount, isOfficeViewer]);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', handleBackPress);
    return () => sub.remove();
  }, [handleBackPress]);

  useEffect(() => {
    return () => {
      Orientation.unlockAllOrientations();
      Orientation.lockToPortrait();
      KeepAwake.deactivate();
    };
  }, []);

  const getFinalUrl = (url) => {
    if (url.includes("mobiletoken")) return url;
    if (url.includes("view.officeapps.live.com")) return url;
    if (url.includes("docs.google.com")) return url;
    return url.includes("?")
      ? `${url}&mobiletoken=${MOBILE_TOKEN}`
      : `${url}?mobiletoken=${MOBILE_TOKEN}`;
  };


  const handleOrientation = (url) => {
    if (!url) return;
    
   
    const shouldLandscape = url.includes("/live/") || 
                           url.includes("/session-details") || 
                           url.includes("/boards/") ||
                           url.includes("docs.google.com/forms") ||
                           url.includes("docs.google.com/presentation") ||
                           url.includes("docs.google.com/spreadsheets") ||
                           url.includes("youtube.com/embed") ||
                           url.includes("youtube.com/watch");
    
    const isLive = url.includes("/live/");
    setIsLivePage(isLive);

    if (orientationTimeoutRef.current) clearTimeout(orientationTimeoutRef.current);
    orientationTimeoutRef.current = setTimeout(() => {
      if (shouldLandscape) {
        console.log('[Orientation] Locking to landscape for:', url);
        KeepAwake.activate();
        Orientation.unlockAllOrientations();
        Orientation.lockToLandscape();
      } else {
        console.log('[Orientation] Locking to portrait for:', url);
        KeepAwake.deactivate();
        Orientation.unlockAllOrientations();
        Orientation.lockToPortrait();
      }
    }, 200);
  };

  const onLoadProgress = ({ nativeEvent }) => {
    const value = nativeEvent.progress;
    setIsLoading(value < 1);
    
   
    if (isOfficeViewer && value >= 0.8) {
      setOfficeLoading(false);
      if (officeLoadTimeoutRef.current) {
        clearTimeout(officeLoadTimeoutRef.current);
      }
    }
    
    Animated.timing(progress, {
      toValue: value,
      duration: 100,
      easing: Easing.linear,
      useNativeDriver: false,
    }).start();
  };

  const onRefresh = () => {
    setRefreshing(true);
    webViewRef.current?.reload();
    setTimeout(() => setRefreshing(false), 2000);
  };

  const isOfficeUrl = (url) => {
    return url.includes('view.officeapps.live.com') || 
           url.includes('officeapps.live.com') ||
           url.includes('powerpoint.officeapps.live.com');
  };

  const isGoogleFormUrl = (url) => {
    return url.includes('docs.google.com/forms');
  };

  const handleShouldStartLoad = (request) => {
    let url = request.url;
    console.log('[Should Start Load]', url);

    if (url.startsWith('about:blank')) return true;

   
    if (isOfficeViewer && !isOfficeUrl(url)) {
      console.log('[Navigating away from Office viewer]');
      setIsOfficeViewer(false);
      setOfficeLoading(false);
      return true;
    }

  
    if (isGoogleFormUrl(url)) {
      console.log('[Google Form Detected - Setting Landscape]', url);
      setTimeout(() => {
        Orientation.unlockAllOrientations();
        Orientation.lockToLandscape();
      }, 100);
    }

   
    if (isOfficeUrl(url)) {
      console.log('[Office URL Detected]', url);
      setIsOfficeViewer(true);
      setOfficeLoading(true);
      
     
      officeLoadTimeoutRef.current = setTimeout(() => {
        console.log('[Office viewer loading timeout]');
        setOfficeLoading(false);
      }, 10000);
      
      return true;
    }

    
    if (url.includes("/boards/") || url.includes("/video/") || 
        url.includes("youtube.com/embed") || url.includes("docs.google.com/forms")) {
      return true;
    }


    if (!url.includes('mobiletoken') && !isOfficeUrl(url) && !isGoogleFormUrl(url)) {
      const urlWithToken = getFinalUrl(url);
      if (urlWithToken !== url) {
        console.log('[URL Modified with token]', urlWithToken);
        setCurrentUrl(urlWithToken);
        return false;
      }
    }

    return true;
  };

 
  const getInjectedJavaScript = () => {
    const officeFixScript = `
      (function() {
        // Handle Google Forms for better landscape display
        if (window.location.href.includes('docs.google.com/forms')) {
          // Force viewport for better landscape display
          var meta = document.querySelector('meta[name=viewport]');
          if (meta) {
            meta.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes, viewport-fit=cover');
          } else {
            var newMeta = document.createElement('meta');
            newMeta.name = 'viewport';
            newMeta.content = 'width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes, viewport-fit=cover';
            document.head.appendChild(newMeta);
          }
          
          // Make Google Forms full width in landscape
          var style = document.createElement('style');
          style.innerHTML = '.freebirdFormviewerViewFormCard { max-width: 100% !important; width: 100% !important; margin: 0 !important; } .freebirdFormviewerViewHeaderHeader { padding: 10px !important; } .freebirdFormviewerViewItemsItemItem { width: 100% !important; }';
          document.head.appendChild(style);
        }
        
        // Handle YouTube embeds
        if (window.location.href.includes('youtube.com/embed')) {
          var youtubeStyle = document.createElement('style');
          youtubeStyle.innerHTML = 'body { margin: 0; padding: 0; } iframe { width: 100% !important; height: 100% !important; position: absolute; top: 0; left: 0; }';
          document.head.appendChild(youtubeStyle);
        }
        
        // Function to check if Office viewer is loaded
        function checkOfficeViewerLoaded() {
          var iframe = document.querySelector('iframe');
          var contentDiv = document.querySelector('#WACFrame');
          var viewer = document.querySelector('.WACViewer');
          
          if (iframe && iframe.contentWindow) {
            window.ReactNativeWebView.postMessage('officeViewerLoaded');
            return true;
          }
          if (contentDiv && contentDiv.clientHeight > 0) {
            window.ReactNativeWebView.postMessage('officeViewerLoaded');
            return true;
          }
          if (viewer && viewer.clientHeight > 0) {
            window.ReactNativeWebView.postMessage('officeViewerLoaded');
            return true;
          }
          return false;
        }
        
        // Fix for iOS WebView with Office documents
        if (window.location.href.includes('view.officeapps.live.com')) {
          // Force iframe to be visible
          setTimeout(function() {
            var frames = document.querySelectorAll('iframe');
            frames.forEach(function(frame) {
              frame.style.width = '100%';
              frame.style.height = '100%';
              frame.style.position = 'absolute';
              frame.style.top = '0';
              frame.style.left = '0';
              frame.style.display = 'block';
              frame.style.visibility = 'visible';
              frame.style.opacity = '1';
            });
            
            // Fix for zoom issues
            var meta = document.querySelector('meta[name=viewport]');
            if (meta) {
              meta.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes');
            }
            
            // Force a resize event
            window.dispatchEvent(new Event('resize'));
            
            // Check every 500ms if viewer is loaded
            var checkInterval = setInterval(function() {
              if (checkOfficeViewerLoaded()) {
                clearInterval(checkInterval);
              }
            }, 500);
            
            // Stop checking after 10 seconds
            setTimeout(function() {
              clearInterval(checkInterval);
              window.ReactNativeWebView.postMessage('officeViewerTimeout');
            }, 10000);
            
          }, 500);
        }
        
        // Disable context menu
        document.addEventListener('contextmenu', function(e) { e.preventDefault(); });
        
        // Style to make everything visible
        var style = document.createElement('style');
        style.innerHTML = '* { -webkit-user-select: none !important; user-select: none !important; } iframe { display: block !important; visibility: visible !important; }';
        document.head.appendChild(style);
      })();
      true;
    `;
    
    return officeFixScript + scrollMonitorScript + autoPlayVideoJS;
  };

  const scrollMonitorScript = `
    (function () {
      if (window.__scrollMonitorInjected) return true;
      window.__scrollMonitorInjected = true;
      let timeout;
      function triggerScroll() { 
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage('userScrolled');
        }
      }
      window.addEventListener('scroll', function () {
        clearTimeout(timeout);
        timeout = setTimeout(triggerScroll, 100);
      }, true);
    })();
    true;
  `;

  const autoPlayVideoJS = `
    (function() {
      const videos = document.querySelectorAll('video, iframe[src*="youtube.com/embed"]');
      videos.forEach(video => {
        try {
          if(video.tagName === 'VIDEO') {
            video.play().catch(e => console.log('Video play error', e));
          } else if(video.tagName === 'IFRAME') {
            const src = video.src;
            if(!src.includes('autoplay=1')) {
              video.src = src + (src.includes('?') ? '&' : '?') + 'autoplay=1&playsinline=1';
            }
          }
        } catch(e) {}
      });
    })();
    true;
  `;

  const smoothScrollToTop = `
    (function() {
      const duration = 5000;
      const interval = 15;
      const totalSteps = duration / interval;
      let step = 0;
      const start = document.documentElement.scrollTop;
      const scrollStep = start / totalSteps;
      const scrollInterval = setInterval(() => {
        if (step < totalSteps) {
          document.documentElement.scrollTop -= scrollStep;
          step++;
        } else {
          document.documentElement.scrollTop = 0;
          clearInterval(scrollInterval);
        }
      }, interval);
    })();
    true;
  `;

  const handleMessage = (event) => {
    const data = event.nativeEvent.data;
    console.log('[Message from WebView]', data);
    
    if (data === 'officeViewerLoaded') {
      console.log('[Office viewer loaded successfully]');
      setOfficeLoading(false);
      if (officeLoadTimeoutRef.current) {
        clearTimeout(officeLoadTimeoutRef.current);
      }
    } else if (data === 'officeViewerTimeout') {
      console.log('[Office viewer loading timeout]');
      setOfficeLoading(false);
    } else if (data === 'userScrolled') {
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
      scrollTimeoutRef.current = setTimeout(() => {
        webViewRef.current?.injectJavaScript(smoothScrollToTop);
      }, 15000);
    }
  };

  const handleNavigationStateChange = (navState) => {
    console.log('[Navigation State]', navState.url);
    setCanGoBack(navState.canGoBack);
    
    const isOffice = isOfficeUrl(navState.url);
    if (isOffice !== isOfficeViewer) {
      setIsOfficeViewer(isOffice);
      if (isOffice) {
        setOfficeLoading(true);
      }
    }
    
    if (!isOffice) {
      handleOrientation(navState.url);
    } else {
      Orientation.unlockAllOrientations();
    }
  };

  const handleLoadEnd = () => {
    console.log('[WebView Load End]');
    setIsLoading(false);
    setOfficeLoading(false);
    if (officeLoadTimeoutRef.current) {
      clearTimeout(officeLoadTimeoutRef.current);
    }
  };

  return (
    <>
      <StatusBar
        hidden={isLivePage}
        translucent={!isLivePage}
        backgroundColor="transparent"
      />
      <SafeAreaView
        style={[styles.container, isLivePage && Platform.OS === 'ios' ? styles.iosLiveContainer : styles.container]}
        edges={isLivePage ? [] : ['top', 'left', 'right', 'bottom']}
      >
        {/* Custom loader for Office documents */}
        {(isLoading || officeLoading) && (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color="#dfe6ec" />
          </View>
        )}
        
        {isLoading && !isOfficeViewer && (
          <Animated.View
            style={[
              styles.progressBar,
              {
                width: progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
              },
            ]}
          />
        )}
        
        <WebView
          key={webViewKey}
          ref={webViewRef}
          source={{ uri: currentUrl }}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          startInLoadingState={false}
          allowsInlineMediaPlayback={true}
          mediaPlaybackRequiresUserAction={false}
          originWhitelist={['*']}
          injectedJavaScript={getInjectedJavaScript()}
          onShouldStartLoadWithRequest={handleShouldStartLoad}
          onNavigationStateChange={handleNavigationStateChange}
          onMessage={handleMessage}
          onLoadProgress={onLoadProgress}
          onLoadEnd={handleLoadEnd}
          onError={(syntheticEvent) => {
            const { nativeEvent } = syntheticEvent;
            console.error('[WebView Error]', nativeEvent);
            setOfficeLoading(false);
            setIsLoading(false);
          }}
          onHttpError={(syntheticEvent) => {
            const { nativeEvent } = syntheticEvent;
            console.error('[HTTP Error]', nativeEvent.statusCode, nativeEvent.url);
            setOfficeLoading(false);
          }}
          pullToRefreshEnabled={Platform.OS === 'android'}
          onRefresh={onRefresh}
          refreshing={refreshing}
          cacheEnabled={true}
          incognito={false}
          allowsBackForwardNavigationGestures={true}
          automaticallyAdjustContentInsets={true}
          contentInsetAdjustmentBehavior="automatic"
          userAgent={Platform.OS === 'ios' ? 
            "Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1" : 
            undefined}
        />
      </SafeAreaView>
    </>
  );
};

export default Home;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#080707',
  },
  iosLiveContainer: {
    flex: 1,
    backgroundColor: '#080707',
    paddingBottom: 10,
    marginLeft: -30,
    marginBottom: -10,
  },
  progressBar: {
    height: 3,
    backgroundColor: '#2196F3',
    position: 'absolute',
    top: 0,
    zIndex: 999,
  },
  loaderContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    zIndex: 1000,
  },
});