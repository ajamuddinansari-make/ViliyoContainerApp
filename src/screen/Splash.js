import { View, Text, StyleSheet, Image } from 'react-native'
import React, { useEffect } from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import { moderateScale } from '../components/Responsive'


const Splash = ({navigation}) => {

   const IOS_APP_ID = '6756782373'; 

    useEffect(() => {
        const timer = setTimeout(() =>{
            navigation.replace("Home")
        }, 2000) ;
    
    
    return () => clearTimeout(timer)
}, [navigation]);



  return (
    <SafeAreaView style={styles.container}>
      {/* <Text style={styles.text}>Viliyo</Text> */}
      <Image 
      source ={require('../assets/images/Splash.png')}
      style={styles.splashImg}
      resizeMode="contain"
      />
    </SafeAreaView>
  )
}

export default Splash

const styles = StyleSheet.create({ 
  container : {
    flex:1,
    justifyContent:'center',
    alignItems:'center',
    backgroundColor:'#fff'
  }, 
  text : {
    fontSize: moderateScale(24),
    fontWeight:'bold',
    color:'#6a10d0ff'
  },
  splashImg:{
    width:'50%',
    height:'50%'
  }
  
  
 })




















//  import React, { useEffect } from 'react';
// import {
//   StyleSheet,
//   Image,
//   Alert,
//   Linking,
//   Platform,
// } from 'react-native';
// import { SafeAreaView } from 'react-native-safe-area-context';
// import VersionCheck from 'react-native-version-check';

// const Splash = ({ navigation }) => {
//   const IOS_APP_ID = '6756782373'; 

//   useEffect(() => {
//     checkAppUpdate();
//   }, []);

 
//   const checkAppUpdate = async () => {
//     try {
//       const updateInfo = await VersionCheck.needUpdate();

   
//       if (updateInfo?.isNeeded) {
//         showUpdatePopup(updateInfo.storeUrl);
//       } else {
//         goToHome();
//       }
//     } catch (error) {
//       console.log('Version check failed:', error);
//       goToHome();
//     }
//   };


//   const showUpdatePopup = (storeUrl) => {
//     Alert.alert(
//       'Update Available',
//       'A newer version of the app is available. Please update to continue.',
//       [
//         {
//           text: 'Update',
//           onPress: () => Linking.openURL(storeUrl),
//         },
//       ],
//       { cancelable: false }
//     );
//   };

 
//   const goToHome = () => {
//     setTimeout(() => {
//       navigation.replace('Home');
//     }, 1500);
//   };

//   return (
//     <SafeAreaView style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
//       <Image
//         source={require('../assets/images/Splash.png')}
//         style={styles.splashImg}
//         resizeMode="contain"
//       />
//     </SafeAreaView>
//   );
// };

// export default Splash;

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: '#fff',
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   splashImg: {
//     width: '50%',
//     height: '50%',
//   },
// });
