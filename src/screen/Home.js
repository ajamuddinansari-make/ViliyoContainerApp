import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  BackHandler,
  ToastAndroid,
  Animated,
  Easing,
  PermissionsAndroid,
  Platform,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { SafeAreaView } from 'react-native-safe-area-context';
import Orientation from 'react-native-orientation-locker';
import KeepAwake from 'react-native-keep-awake';

const HOME_URL = 'https://learner-dashboard-v3.viliyo.com/dashboard';

const Home = () => {
  const webViewRef = useRef(null);
  const progress = useRef(new Animated.Value(0)).current;
  const scrollTimeoutRef = useRef(null);

  const [canGoBack, setCanGoBack] = useState(false);
  const [backPressCount, setBackPressCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isLandscape, setIsLandscape] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

 
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
    };
  }, []);

 
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

 
  const handleOrientation = (url) => {
    // const shouldLandscape = url.includes('/live') || url.includes('/configuration');

     const shouldLandscape = url.includes('/live') || url.includes('/session-details?');

    if (shouldLandscape) {
      KeepAwake.activate();
      Orientation.unlockAllOrientations();
      setTimeout(() => Orientation.lockToLandscape(), 400);
    } else {
      KeepAwake.deactivate();
      Orientation.unlockAllOrientations();
      setTimeout(() => Orientation.lockToPortrait(), 400);
    }
  };

  
  const disableLongPressJS = `
    document.addEventListener('contextmenu', function(e) { e.preventDefault(); });
    const style = document.createElement('style');
    style.innerHTML = '* { -webkit-user-select: none !important; -webkit-touch-callout: none !important; user-select: none !important; }';
    document.head.appendChild(style);
    true;
  `;

 
  const scrollMonitorScript = `
    (function () {
      if (window.__scrollMonitorInjected) return true;
      window.__scrollMonitorInjected = true;

      let timeout;
      function triggerScroll() {
        window.ReactNativeWebView.postMessage('userScrolled');
      }

      window.addEventListener('scroll', function () {
        clearTimeout(timeout);
        timeout = setTimeout(triggerScroll, 100);
      }, true);

    })();
    true;
  `;


  const smoothScrollToTop = `
    (function() {
      const allElements = [document.scrollingElement || document.documentElement || document.body];
      document.querySelectorAll('*').forEach(el => {
        if (el.scrollHeight > el.clientHeight) allElements.push(el);
      });

      allElements.forEach(el => {
        const duration = 5000; // total duration in ms
        const interval = 15; // interval per step in ms
        const totalSteps = duration / interval;
        let step = 0;
        const startPos = el.scrollTop;
        const scrollStep = startPos / totalSteps;

        const scrollInterval = setInterval(() => {
          if (step < totalSteps) {
            el.scrollTop = el.scrollTop - scrollStep;
            step++;
          } else {
            el.scrollTop = 0;
            clearInterval(scrollInterval);
          }
        }, interval);
      });
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
    <SafeAreaView style={styles.container}>
      {isLoading && (
        <Animated.View
          style={[
            styles.progressBar,
            {
              width: progress.interpolate({
                inputRange: [0, 1],
                outputRange: ['0%', '100%'],
              }),
            },
          ]}
        />
      )}

      <WebView
        ref={webViewRef}
        source={{ uri: HOME_URL }}
        style={{ flex: 1 }}
        javaScriptEnabled
        startInLoadingState
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        originWhitelist={['*']}
        onLoadProgress={onLoadProgress}
        pullToRefreshEnabled={Platform.OS === 'android'}
        onRefresh={onRefresh}
        refreshing={refreshing}
        bounces={true}
        injectedJavaScriptBeforeContentLoaded={disableLongPressJS}
        injectedJavaScript={scrollMonitorScript}
        onMessage={handleMessage}
        onNavigationStateChange={(navState) => {
          const url = navState.url || '';
          console.log('Navigated to URL:', url);
          setCanGoBack(navState.canGoBack);
          handleOrientation(url);
        }}
      />
    </SafeAreaView>
  );
};

export default Home;

const styles = StyleSheet.create({
  container: { flex: 1 },
  progressBar: {
    height: 3,
    backgroundColor: '#2196F3',
  },
});
