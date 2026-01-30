import { View, Text, StyleSheet, Image } from 'react-native'
import React, { useEffect } from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import { moderateScale } from '../components/Responsive'


const Splash = ({navigation}) => {
    

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






