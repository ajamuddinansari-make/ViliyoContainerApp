import { View, Text } from 'react-native'
import React from 'react'
import Splash from '../screen/Splash'
import Home from '../screen/Home'
import { createNativeStackNavigator } from '@react-navigation/native-stack'

const Stack = createNativeStackNavigator()

const MainNavigator = () => {
  return (
    // <View>
    //   <Text>MainNavigator</Text>
    // </View>


      <Stack.Navigator>
         <Stack.Screen
         name="Splash"
         component={Splash}
         options ={{headerShown : false}}
         />
       
       <Stack.Screen 
       name='Home'
       component={Home}
       options={{headerShown: false}}
       />
       

      </Stack.Navigator>


  )
}

export default MainNavigator


