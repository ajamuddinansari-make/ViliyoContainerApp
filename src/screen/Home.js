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
  Alert,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { SafeAreaView } from 'react-native-safe-area-context';
import Orientation from 'react-native-orientation-locker';
import KeepAwake from 'react-native-keep-awake';
import { useNavigation } from '@react-navigation/native';
import ImmersiveMode from "react-native-immersive-mode";



import CustomModal from '../components/CustomModal';

const HOME_URL = 'https://learner.viliyo.com/dashboard';
const MOBILE_TOKEN = "210303120209";

const Home = () => {

  const navigation = useNavigation();

  const webViewRef = useRef(null);
  const progress = useRef(new Animated.Value(0)).current;
  const scrollTimeoutRef = useRef(null);
  const orientationTimeoutRef = useRef(null);
  const appStateRef = useRef(AppState.currentState);
  const officeLoadTimeoutRef = useRef(null);
  const googleDriveLoadTimeoutRef = useRef(null);

  const [currentUrl, setCurrentUrl] = useState(`${HOME_URL}?mobiletoken=${MOBILE_TOKEN}`);
  const [canGoBack, setCanGoBack] = useState(false);
  const [backPressCount, setBackPressCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isLivePage, setIsLivePage] = useState(false);
  const [isOfficeViewer, setIsOfficeViewer] = useState(false);
  const [officeLoading, setOfficeLoading] = useState(false);
  const [webViewKey, setWebViewKey] = useState(0);
  const [isGoogleDriveAuth, setIsGoogleDriveAuth] = useState(false);
  const [googleDriveLoadAttempts, setGoogleDriveLoadAttempts] = useState(0);
  const [pendingNavigation, setPendingNavigation] = useState(null);


  const [showLeaveModal, setShowLeaveModal] = useState(false);

  const targetUrl = 'https://learnerlive.viliyo.com/live/';


  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      if (!isLiveSessionUrl(currentUrl)) {
        return;
      }

      console.log('Blocking iOS back, showing modal');

      e.preventDefault();


      setPendingNavigation(e.data.action);

      setShowLeaveModal(true);
    });

    return unsubscribe;
  }, [navigation, currentUrl]);

useEffect(() => {
  if (isLivePage) {
    ImmersiveMode.fullLayout(true);
    ImmersiveMode.setBarMode("Full"); 
  } else {
    ImmersiveMode.setBarMode("Normal"); 
  }
}, [isLivePage]);

  
  const handleConfirmLeave = () => {
    setShowLeaveModal(false);

    if (webViewRef.current && canGoBack) {
      webViewRef.current.goBack();
      return;
    }


    if (pendingNavigation) {
      navigation.dispatch(pendingNavigation);
      setPendingNavigation(null);
    } else {
      navigation.goBack();
    }
  };

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
      if (googleDriveLoadTimeoutRef.current) {
        clearTimeout(googleDriveLoadTimeoutRef.current);
      }
    };
  }, []);


  const handleBackPress = useCallback(() => {
    if (isOfficeViewer && webViewRef.current) {
      webViewRef.current.goBack();
      return true;
    }

    if (canGoBack && webViewRef.current) {

      setShowLeaveModal(true);
      return true;
    }

    if (backPressCount === 0) {
      setBackPressCount(1);
      if (Platform.OS === 'android') {
        ToastAndroid.show('Press back again to exit', ToastAndroid.SHORT);
      }
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
    if (url.includes("drive.google.com")) return url;
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

    if (!isGoogleDriveAuth) {
      setIsLoading(value < 1);
    }

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

  const isGoogleDriveAuthUrl = (url) => {
    return url.includes('drive.google.com/auth_warmup') ||
      url.includes('accounts.google.com') ||
      (url.includes('drive.google.com') && url.includes('auth'));
  };

  const isGoogleDriveViewerUrl = (url) => {
    return url.includes('docs.google.com/viewer') ||
      (url.includes('drive.google.com') && url.includes('viewer'));
  };

  const handleShouldStartLoad = (request) => {
    let url = request.url;
    console.log('[Should Start Load]', url);

    if (url.startsWith('about:blank')) return true;

    if (Platform.OS === 'ios' && isGoogleDriveAuthUrl(url)) {
      console.log('[iOS] Google Drive auth detected, handling...');
      setIsGoogleDriveAuth(true);
      setIsLoading(true);

      if (googleDriveLoadTimeoutRef.current) {
        clearTimeout(googleDriveLoadTimeoutRef.current);
      }
      googleDriveLoadTimeoutRef.current = setTimeout(() => {
        console.log('[iOS] Google Drive auth timeout, hiding loader');
        setIsLoading(false);
        setIsGoogleDriveAuth(false);
      }, 100);

      return true;
    }

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
      }, 1000);

      return true;
    }

    if (url.includes("/boards/") || url.includes("/video/") ||
      url.includes("youtube.com/embed") || url.includes("docs.google.com/forms")) {
      return true;
    }

    if (!url.includes('mobiletoken') && !isOfficeUrl(url) && !isGoogleFormUrl(url) && !isGoogleDriveAuthUrl(url)) {
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
        // Handle Google Drive viewer issues on iOS
        if (window.location.href.includes('docs.google.com/viewer') || 
            window.location.href.includes('drive.google.com')) {
          
          console.log('[JS] Google Drive viewer detected');
          
          // Force viewport for better display
          var meta = document.querySelector('meta[name=viewport]');
          if (meta) {
            meta.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes, viewport-fit=cover');
          }
          
          // Check if the viewer is loaded properly
          function checkViewerLoaded() {
            var viewer = document.querySelector('#viewer');
            var iframe = document.querySelector('iframe');
            var docViewer = document.querySelector('.doc-viewer');
            var pdfViewer = document.querySelector('.pdf-viewer');
            
            if (viewer && viewer.clientHeight > 0) {
              console.log('[JS] Google viewer loaded (viewer element)');
              window.ReactNativeWebView.postMessage('googleViewerLoaded');
              return true;
            }
            if (iframe && iframe.contentWindow && iframe.clientHeight > 0) {
              console.log('[JS] Google viewer loaded (iframe)');
              window.ReactNativeWebView.postMessage('googleViewerLoaded');
              return true;
            }
            if (docViewer && docViewer.clientHeight > 0) {
              console.log('[JS] Google viewer loaded (doc-viewer)');
              window.ReactNativeWebView.postMessage('googleViewerLoaded');
              return true;
            }
            if (pdfViewer && pdfViewer.clientHeight > 0) {
              console.log('[JS] Google viewer loaded (pdf-viewer)');
              window.ReactNativeWebView.postMessage('googleViewerLoaded');
              return true;
            }
            return false;
          }
          
          // Check every 500ms if viewer is loaded
          var checkCount = 0;
          var checkInterval = setInterval(function() {
            checkCount++;
            if (checkViewerLoaded()) {
              clearInterval(checkInterval);
            } else if (checkCount > 20) {
              // After 10 seconds, stop checking
              console.log('[JS] Google viewer load timeout');
              clearInterval(checkInterval);
              window.ReactNativeWebView.postMessage('googleViewerTimeout');
            }
          }, 500);
          
          // Also listen for load events
          window.addEventListener('load', function() {
            console.log('[JS] Window load event fired');
            setTimeout(function() {
              checkViewerLoaded();
            }, 1000);
          });
          
          // Fix for auth warmup issues
          if (window.location.href.includes('auth_warmup')) {
            console.log('[JS] Auth warmup detected, attempting to reload');
            setTimeout(function() {
              window.location.reload();
            }, 1000);
          }
        }
        
        // Handle Google Forms for better landscape display
        if (window.location.href.includes('docs.google.com/forms')) {
          var meta = document.querySelector('meta[name=viewport]');
          if (meta) {
            meta.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes, viewport-fit=cover');
          } else {
            var newMeta = document.createElement('meta');
            newMeta.name = 'viewport';
            newMeta.content = 'width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes, viewport-fit=cover';
            document.head.appendChild(newMeta);
          }
          
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
            
            var meta = document.querySelector('meta[name=viewport]');
            if (meta) {
              meta.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes');
            }
            
            window.dispatchEvent(new Event('resize'));
            
            var checkInterval = setInterval(function() {
              if (checkOfficeViewerLoaded()) {
                clearInterval(checkInterval);
              }
            }, 500);
            
            setTimeout(function() {
              clearInterval(checkInterval);
              window.ReactNativeWebView.postMessage('officeViewerTimeout');
            }, 10000);
            
          }, 500);
        }
        
        // Disable context menu
        document.addEventListener('contextmenu', function(e) { e.preventDefault(); });
        
        var style = document.createElement('style');
        style.innerHTML = '* { -webkit-user-select: none !important; user-select: none !important; } iframe { display: block !important; visibility: visible !important; }';
        document.head.appendChild(style);
      })();
      true;
    `;

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

    return officeFixScript + scrollMonitorScript + autoPlayVideoJS;
  };

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
    } else if (data === 'googleViewerLoaded') {
      console.log('[Google viewer loaded successfully]');
      setIsLoading(false);
      setIsGoogleDriveAuth(false);
      if (googleDriveLoadTimeoutRef.current) {
        clearTimeout(googleDriveLoadTimeoutRef.current);
      }
    } else if (data === 'googleViewerTimeout') {
      console.log('[Google viewer timeout]');
      setIsLoading(false);
      setIsGoogleDriveAuth(false);
      if (googleDriveLoadTimeoutRef.current) {
        clearTimeout(googleDriveLoadTimeoutRef.current);
      }
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
    setCurrentUrl(navState.url); 

    const isOffice = isOfficeUrl(navState.url);
    if (isOffice !== isOfficeViewer) {
      setIsOfficeViewer(isOffice);
      if (isOffice) {
        setOfficeLoading(true);
      }
    }

    if (!navState.url.includes('drive.google.com') && !navState.url.includes('docs.google.com')) {
      if (isGoogleDriveAuth) {
        console.log('[Navigation] Exiting Google Drive, resetting auth state');
        setIsGoogleDriveAuth(false);
        setIsLoading(false);
      }
    }

    if (isGoogleDriveViewerUrl(navState.url) && isGoogleDriveAuth) {
      console.log('[Navigation] Reached Google Drive viewer, hiding loader');
      setIsGoogleDriveAuth(false);
      setIsLoading(false);
      if (googleDriveLoadTimeoutRef.current) {
        clearTimeout(googleDriveLoadTimeoutRef.current);
      }
    }

    if (!isOffice) {
      handleOrientation(navState.url);
    } else {
      Orientation.unlockAllOrientations();
    }
  };


  useEffect(() => {
    const backAction = () => {

      if (isLiveSessionUrl(currentUrl)) {
        setShowLeaveModal(true);
        return true;
      }


      if (canGoBack && webViewRef.current) {
        webViewRef.current.goBack();
        return true;
      }

      return false;
    };

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      backAction
    );

    return () => backHandler.remove();
  }, [currentUrl, canGoBack]);



  const isLiveSessionUrl = (url) => {
    return url?.includes('/live');
  };




  const handleLoadEnd = () => {
    console.log('[WebView Load End]');

    setIsLoading(false);
    setOfficeLoading(false);

    if (isGoogleDriveAuth) {
      console.log('[Load End] Google Drive auth load ended');

      setTimeout(() => {
        setIsGoogleDriveAuth(false);
        setIsLoading(false);
      }, 1000);
    }

    if (officeLoadTimeoutRef.current) {
      clearTimeout(officeLoadTimeoutRef.current);
    }
    if (googleDriveLoadTimeoutRef.current) {
      clearTimeout(googleDriveLoadTimeoutRef.current);
    }
  };

  const handleLoadStart = () => {
    console.log('[WebView Load Start]');
  };

  const handleError = (syntheticEvent) => {
    const { nativeEvent } = syntheticEvent;
    console.error('[WebView Error]', nativeEvent);
    setOfficeLoading(false);
    setIsLoading(false);

    if (isGoogleDriveAuth) {
      console.log('[Error] Resetting Google Drive auth state');
      setIsGoogleDriveAuth(false);
    }

    if (googleDriveLoadTimeoutRef.current) {
      clearTimeout(googleDriveLoadTimeoutRef.current);
    }
  };

  const shouldShowLoader = () => {
    return isLoading || officeLoading || isGoogleDriveAuth;
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
        {shouldShowLoader() && (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color="#dfe6ec" />
          </View>
        )}

        {isLoading && !isOfficeViewer && !isGoogleDriveAuth && (
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
          onLoadStart={handleLoadStart}
          onLoadEnd={handleLoadEnd}
          onError={handleError}
          onHttpError={(syntheticEvent) => {
            const { nativeEvent } = syntheticEvent;
            console.error('[HTTP Error]', nativeEvent.statusCode, nativeEvent.url);
            setOfficeLoading(false);
            if (isGoogleDriveAuth) {
              setIsGoogleDriveAuth(false);
              setIsLoading(false);
            }
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


      <CustomModal
        visible={showLeaveModal}
        title="Leave Session"
        message="Are you sure you want to leave this session?"
        onConfirm={handleConfirmLeave}
        onCancel={() => setShowLeaveModal(false)}
      />
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