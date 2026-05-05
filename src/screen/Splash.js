// import { View, Text, StyleSheet, Image } from 'react-native'
// import React, { useEffect } from 'react'
// import { SafeAreaView } from 'react-native-safe-area-context'
// import { moderateScale } from '../components/Responsive'


// const Splash = ({navigation}) => {

//    const IOS_APP_ID = '6756782373'; 

//     useEffect(() => {
//         const timer = setTimeout(() =>{
//             navigation.replace("Home")
//         }, 2000) ;
    
    
//     return () => clearTimeout(timer)
// }, [navigation]);



//   return (
//     <SafeAreaView style={styles.container}>
//       {/* <Text style={styles.text}>Viliyo</Text> */}
//       <Image 
//       source ={require('../assets/images/Splash.png')}
//       style={styles.splashImg}
//       resizeMode="contain"
//       />
//     </SafeAreaView>
//   )
// }

// export default Splash

// const styles = StyleSheet.create({ 
//   container : {
//     flex:1,
//     justifyContent:'center',
//     alignItems:'center',
//     backgroundColor:'#fff'
//   }, 
//   text : {
//     fontSize: moderateScale(24),
//     fontWeight:'bold',
//     color:'#6a10d0ff'
//   },
//   splashImg:{
//     width:'50%',
//     height:'50%'
//   }
  
  
//  })

























import React, { useEffect } from 'react';
import {
  StyleSheet,
  Image,
  Alert,
  Linking,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import VersionCheck from 'react-native-version-check';

const Splash = ({ navigation }) => {
  const IOS_APP_ID = '6758509903';

  useEffect(() => {
    checkAppUpdate();
  }, []);


  const compareVersions = (current, latest) => {
    const c = current.split('.').map(Number);
    const l = latest.split('.').map(Number);

    for (let i = 0; i < Math.max(c.length, l.length); i++) {
      const cNum = c[i] || 0;
      const lNum = l[i] || 0;

      if (lNum > cNum) return true;
      if (lNum < cNum) return false;
    }
    return false;
  };

  const checkAppUpdate = async () => {
    try {
      const currentVersion = VersionCheck.getCurrentVersion();
      console.log('Current App Version:', currentVersion);

      const latestVersion = await VersionCheck.getLatestVersion({
        provider: Platform.OS === 'ios' ? 'appStore' : 'playStore',
        ...(Platform.OS === 'ios' && { appID: IOS_APP_ID }),
      });

      console.log('Latest Store Version:', latestVersion);

      
      const isUpdateNeeded = compareVersions(
        currentVersion,
        latestVersion
      );

      console.log('Is Update Needed:', isUpdateNeeded);

      if (isUpdateNeeded) {
        let storeUrl = await VersionCheck.getStoreUrl({
          ...(Platform.OS === 'ios' && { appID: IOS_APP_ID }),
        });

        if (!storeUrl) {
          storeUrl =
            Platform.OS === 'ios'
              ? `https://apps.apple.com/app/id${IOS_APP_ID}`
              : 'https://play.google.com/store/apps/details?id=com.viliyo';
        }

        showUpdatePopup(storeUrl);
      } else {
        goToHome();
      }
    } catch (error) {
      console.log('Version check failed:', error);
      goToHome();
    }
  };

  const showUpdatePopup = (storeUrl) => {
    Alert.alert(
      'Update Available',
      'A newer version of the app is available. Would you like to update now?',
      [
        { text: 'Later', onPress: () => goToHome(), style: 'cancel' },
        { text: 'Update', onPress: () => Linking.openURL(storeUrl) },
      ],
      { cancelable: false }
    );
  };

  const goToHome = () => {
    setTimeout(() => {
      navigation.replace('Home');
    }, 1500);
  };

  return (
    <SafeAreaView
      style={styles.container}
      edges={['top', 'left', 'right', 'bottom']}
    >
      <Image
        source={require('../assets/images/Splash.png')}
        style={styles.splashImg}
        resizeMode="contain"
      />
    </SafeAreaView>
  );
};

export default Splash;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  splashImg: {
    width: '50%',
    height: '50%',
  },
});