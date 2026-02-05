import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { Platform, BackHandler } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useNavigation, useRoute } from '@react-navigation/native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import { NotificationProvider } from './src/contexts/NotificationContext';
import { theme } from './src/constants/theme';
import { t } from './src/locales';

import { LoginScreen } from './src/screens/LoginScreen';
import { SignUpScreen } from './src/screens/SignUpScreen';
import { ForgotPasswordScreen } from './src/screens/ForgotPasswordScreen';
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
import { ManageGroupsScreen } from './src/screens/ManageGroupsScreen';
import { StatisticsScreen } from './src/screens/StatisticsScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

const CalendarStack = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="CalendarMain" component={CalendarScreen} />
      <Stack.Screen name="BookStudio" component={BookStudioScreen} />
      <Stack.Screen name="BookingDetails" component={BookingDetailsScreen} />
    </Stack.Navigator>
  );
};

const MessagesStack = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MessagesList" component={MessagesScreen} />
      <Stack.Screen name="MessageDetails" component={MessageDetailsScreen} />
      <Stack.Screen name="ComposeMessage" component={ComposeMessageScreen} />
    </Stack.Navigator>
  );
};

const NewsStack = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="NewsList" component={NewsScreen} />
      <Stack.Screen name="NewsDetails" component={NewsDetailsScreen} />
    </Stack.Navigator>
  );
};

const EventsStack = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="EventsList" component={EventsScreen} />
      <Stack.Screen name="EventDetails" component={EventDetailsScreen} />
    </Stack.Navigator>
  );
};

const AdminStack = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="AdminDashboard" component={AdminDashboard} />
      <Stack.Screen name="ManageUsers" component={ManageUsersScreen} />
      <Stack.Screen name="ManageEvents" component={ManageEventsScreen} />
      <Stack.Screen name="ManageNews" component={ManageNewsScreen} />
      <Stack.Screen name="ManageGroups" component={ManageGroupsScreen} />
      <Stack.Screen name="Statistics" component={StatisticsScreen} />
    </Stack.Navigator>
  );
};


const MainTabs = () => {
  const { user } = useAuth();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
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
      <Tab.Screen 
        name="Calendar" 
        component={CalendarStack} 
        options={{ title: t('navigation.calendar') }} 
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            navigation.navigate('Calendar', { screen: 'CalendarView' });
          },
        })}
      />
      <Tab.Screen 
        name="Messages" 
        component={MessagesStack} 
        options={{ title: t('navigation.messages') }} 
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            navigation.navigate('Messages', { screen: 'MessagesList' });
          },
        })}
      />
      <Tab.Screen 
        name="News" 
        component={NewsStack} 
        options={{ title: t('navigation.news') }} 
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            navigation.navigate('News', { screen: 'NewsList' });
          },
        })}
      />
      <Tab.Screen 
        name="Events" 
        component={EventsStack} 
        options={{ title: t('navigation.events') }} 
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            navigation.navigate('Events', { screen: 'EventsList' });
          },
        })}
      />
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
          <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
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
  const navigationRef = React.useRef<any>(null);

  // Update page title based on current route
  const updatePageTitle = (routeName?: string) => {
    if (Platform.OS === 'web') {
      const baseTitle = 'Antonio Dias Flamenco Werkstatt';
      
      const titleMap: { [key: string]: string } = {
        'CalendarMain': t('navigation.calendar'),
        'Calendar': t('navigation.calendar'),
        'MessagesList': t('navigation.messages'),
        'Messages': t('navigation.messages'),
        'MessageDetails': t('messages.messageDetails'),
        'ComposeMessage': t('messages.compose'),
        'NewsList': t('navigation.news'),
        'News': t('navigation.news'),
        'NewsDetails': t('news.title'),
        'EventsList': t('navigation.events'),
        'Events': t('navigation.events'),
        'EventDetails': t('events.eventDetails'),
        'AdminDashboard': t('navigation.admin'),
        'Admin': t('navigation.admin'),
        'ManageUsers': t('admin.manageUsers'),
        'ManageEvents': t('admin.manageEvents'),
        'ManageNews': t('admin.manageNews'),
        'ManageGroups': t('admin.manageGroups'),
        'Statistics': t('admin.statistics'),
        'BookStudio': t('calendar.bookStudio'),
        'BookingDetails': t('calendar.bookingDetails'),
        'Login': t('common.login'),
        'SignUp': t('auth.signUp'),
        'ForgotPassword': t('auth.forgotPassword'),
      };

      const screenTitle = routeName && titleMap[routeName] ? titleMap[routeName] : t('navigation.calendar');
      document.title = `${screenTitle} - ${baseTitle}`;
    }
  };

  useEffect(() => {
    // Set initial title
    updatePageTitle('Calendar');

    const backAction = () => {
      if (navigationRef.current) {
        const canGoBack = navigationRef.current.canGoBack();
        if (canGoBack) {
          navigationRef.current.goBack();
          return true; // Prevent default behavior (exit app)
        }
      }
      return false; // Allow default behavior (exit app) if at root
    };

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      backAction
    );

    return () => backHandler.remove();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <NotificationProvider>
          <NavigationContainer 
            ref={navigationRef}
            onStateChange={() => {
              const currentRoute = navigationRef.current?.getCurrentRoute();
              updatePageTitle(currentRoute?.name);
            }}
          >
            <AppNavigator />
          </NavigationContainer>
        </NotificationProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}
