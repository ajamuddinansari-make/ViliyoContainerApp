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

  const [currentUrl, setCurrentUrl] = useState(`${HOME_URL}?mobiletoken=${MOBILE_TOKEN}`);
  const [canGoBack, setCanGoBack] = useState(false);
  const [backPressCount, setBackPressCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isLivePage, setIsLivePage] = useState(false);

  useEffect(() => {
    if (Platform.OS === 'android') {
      PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.CAMERA,
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
      ]);
    }
  }, []);

  const handleBackPress = useCallback(() => {
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
  }, [canGoBack, backPressCount]);

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
    return url.includes("?")
      ? `${url}&mobiletoken=${MOBILE_TOKEN}`
      : `${url}?mobiletoken=${MOBILE_TOKEN}`;
  };

  const handleOrientation = (url) => {
    if (!url) return;
    const shouldLandscape = url.includes("/live/") || url.includes("/session-details") || url.includes("/boards/");
    const isLive = url.includes("/live/");
    setIsLivePage(isLive);

    if (orientationTimeoutRef.current) clearTimeout(orientationTimeoutRef.current);
    orientationTimeoutRef.current = setTimeout(() => {
      if (shouldLandscape) {
        KeepAwake.activate();
        Orientation.unlockAllOrientations();
        Orientation.lockToLandscape();
      } else {
        KeepAwake.deactivate();
        Orientation.unlockAllOrientations();
        Orientation.lockToPortrait();
      }
    }, 200);
  };

  const onLoadProgress = ({ nativeEvent }) => {
    const value = nativeEvent.progress;
    setIsLoading(value < 1);
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

 
  const convertToEmbedUrl = (url) => {
    if (url.includes("PowerPointFrame.aspx")) {
     
      const match = url.match(/wFileId=(https%3A%2F%2F.*?\.ppt)/);
      if (match && match[1]) {
        const fileUrl = decodeURIComponent(match[1]);
        return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(fileUrl)}`;
      }
    }
    return url;
  };

  const handleShouldStartLoad = (request) => {
    let url = request.url;
    console.log('Requesting URL:', url);

    if (url.startsWith('about:blank')) return true;

   
    url = convertToEmbedUrl(url);

  
    if (url.includes("view.officeapps.live.com/op/embed.aspx")) {
      if (url !== currentUrl) setCurrentUrl(url);
      return false; 
    }

  
    if (url.includes("/boards/") || url.includes("/video/") || url.includes("youtube.com/embed")) {
      return true;
    }

    
    if (!url.includes('mobiletoken')) {
      const urlWithToken = getFinalUrl(url);
      if (urlWithToken !== url) {
        setCurrentUrl(urlWithToken);
        return false;
      }
    }

    return true;
  };

  const disableLongPressJS = `
    document.addEventListener('contextmenu', function(e) { e.preventDefault(); });
    const style = document.createElement('style');
    style.innerHTML = '* { -webkit-user-select: none !important; user-select: none !important; }';
    document.head.appendChild(style);
    true;
  `;

  const scrollMonitorScript = `
    (function () {
      if (window.__scrollMonitorInjected) return true;
      window.__scrollMonitorInjected = true;
      let timeout;
      function triggerScroll() { window.ReactNativeWebView.postMessage('userScrolled'); }
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
    if (event.nativeEvent.data === 'userScrolled') {
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
      scrollTimeoutRef.current = setTimeout(() => {
        webViewRef.current?.injectJavaScript(smoothScrollToTop);
      }, 15000);
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
        style={[styles.container, isLivePage && { paddingBottom: 10, marginLeft: -30, marginBottom: -10 }]}
        edges={isLivePage ? [] : ['top', 'left', 'right', 'bottom']}
      >
        {isLoading && (
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
          ref={webViewRef}
          source={{ uri: currentUrl }}
          javaScriptEnabled
          startInLoadingState
          allowsInlineMediaPlayback={true}
          mediaPlaybackRequiresUserAction={false}
          originWhitelist={['*']}
          injectedJavaScriptBeforeContentLoaded={disableLongPressJS}
          injectedJavaScript={scrollMonitorScript + autoPlayVideoJS}
          onShouldStartLoadWithRequest={handleShouldStartLoad}
          onNavigationStateChange={(navState) => {
            setCanGoBack(navState.canGoBack);
            handleOrientation(navState.url);
          }}
          onMessage={handleMessage}
          pullToRefreshEnabled={Platform.OS === 'android'}
          onRefresh={onRefresh}
          refreshing={refreshing}
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
  progressBar: {
    height: 3,
    backgroundColor: '#2196F3',
  },
});