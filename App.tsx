import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useNavigation, useRoute } from '@react-navigation/native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import { theme } from './src/constants/theme';
import { t } from './src/locales';

import { LoginScreen } from './src/screens/LoginScreen';
import { SignUpScreen } from './src/screens/SignUpScreen';
import { CalendarScreen } from './src/screens/CalendarScreen';
import { BookStudioScreen } from './src/screens/BookStudioScreen';
import { BookingDetailsScreen } from './src/screens/BookingDetailsScreen';
import { MessagesScreen } from './src/screens/MessagesScreen';
import { MessageDetailsScreen } from './src/screens/MessageDetailsScreen';
import { ComposeMessageScreen } from './src/screens/ComposeMessageScreen';
import { NewsScreen } from './src/screens/NewsScreen';
import { NewsDetailsScreen } from './src/screens/NewsDetailsScreen';
import { EventsScreen } from './src/screens/EventsScreen';
import { EventDetailsScreen } from './src/screens/EventDetailsScreen';
import { AdminDashboard } from './src/screens/AdminDashboard';
import { ManageUsersScreen } from './src/screens/ManageUsersScreen';
import { ManageEventsScreen } from './src/screens/ManageEventsScreen';
import { ManageNewsScreen } from './src/screens/ManageNewsScreen';
import { StatisticsScreen } from './src/screens/StatisticsScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

const AdminStack = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="AdminDashboard" component={AdminDashboard} />
      <Stack.Screen name="ManageUsers" component={ManageUsersScreen} />
      <Stack.Screen name="ManageEvents" component={ManageEventsScreen} />
      <Stack.Screen name="ManageNews" component={ManageNewsScreen} />
      <Stack.Screen name="Statistics" component={StatisticsScreen} />
    </Stack.Navigator>
  );
};

// Wrapper components for Tab Navigator
const MessageDetailsWrapper = () => {
  const navigation = useNavigation();
  const route = useRoute();
  
  return <MessageDetailsScreen navigation={navigation} route={route} />;
};

const ComposeMessageWrapper = () => {
  const navigation = useNavigation();
  const route = useRoute();
  
  return <ComposeMessageScreen navigation={navigation} route={route} />;
};

const NewsDetailsWrapper = () => {
  const navigation = useNavigation();
  const route = useRoute();
  
  return <NewsDetailsScreen navigation={navigation} route={route} />;
};

const EventDetailsWrapper = () => {
  const navigation = useNavigation();
  const route = useRoute();
  
  return <EventDetailsScreen navigation={navigation} route={route} />;
};

const MainTabs = () => {
  const { user } = useAuth();

  return (
    <Tab.Navigator
      sceneContainerStyle={{ flex: 1, backgroundColor: '#fff' }}
      screenOptions={({ route }) => ({
        tabBarPosition: 'bottom',
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          if (route.name === 'Calendar') {
            iconName = focused ? 'calendar' : 'calendar-outline';
          } else if (route.name === 'Messages') {
            iconName = focused ? 'mail' : 'mail-outline';
          } else if (route.name === 'News') {
            iconName = focused ? 'newspaper' : 'newspaper-outline';
          } else if (route.name === 'Events') {
            iconName = focused ? 'star' : 'star-outline';
          } else if (route.name === 'Admin') {
            iconName = focused ? 'settings' : 'settings-outline';
          } else {
            iconName = 'home-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textSecondary,
        headerShown: false,
      })}
    >
      <Tab.Screen name="Calendar" component={CalendarScreen} options={{ title: t('navigation.calendar') }} />
      <Tab.Screen name="Messages" component={MessagesScreen} options={{ title: t('navigation.messages') }} />
      <Tab.Screen name="MessageDetails" component={MessageDetailsWrapper} options={{ 
        title: t('messages.messageDetails'),
        tabBarButton: () => null, // Hide from tab bar
      }} />
      <Tab.Screen name="ComposeMessage" component={ComposeMessageWrapper} options={{ 
        title: t('messages.composeMessage'),
        tabBarButton: () => null, // Hide from tab bar
      }} />
      <Tab.Screen name="News" component={NewsScreen} options={{ title: t('navigation.news') }} />
      <Tab.Screen name="NewsDetails" component={NewsDetailsWrapper} options={{ 
        title: t('news.title'),
        tabBarButton: () => null, // Hide from tab bar
      }} />
      <Tab.Screen name="Events" component={EventsScreen} options={{ title: t('navigation.events') }} />
      <Tab.Screen name="EventDetails" component={EventDetailsWrapper} options={{ 
        title: t('events.title'),
        tabBarButton: () => null, // Hide from tab bar
      }} />
      {user?.role === 'admin' && (
        <Tab.Screen name="Admin" component={AdminStack} options={{ title: t('navigation.admin') }} />
      )}
    </Tab.Navigator>
  );
};

const AppNavigator = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return null;
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!user ? (
        <>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="SignUp" component={SignUpScreen} />
        </>
      ) : (
        <>
          <Stack.Screen name="Main" component={MainTabs} />
          <Stack.Screen name="BookStudio" component={BookStudioScreen} />
          <Stack.Screen name="BookingDetails" component={BookingDetailsScreen} />
        </>
      )}
    </Stack.Navigator>
  );
};

export default function App() {

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <NavigationContainer>
          <AppNavigator />
        </NavigationContainer>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}
