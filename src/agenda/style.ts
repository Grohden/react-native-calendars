import { Platform, StyleSheet } from 'react-native';
import * as defaultStyle from '../styles';
import { CalendarTheme, CalendarThemeIds } from '../types';

const STYLESHEET_ID: CalendarThemeIds = 'stylesheet.agenda.main';

export default function styleConstructor(
    theme: CalendarTheme | undefined = {}
) {
    const appStyle = { ...defaultStyle, ...theme };

  return StyleSheet.create({
      knob: {
          width: 38,
          height: 7,
          marginTop: 10,
          borderRadius: 3,
          backgroundColor: appStyle.agendaKnobColor
      },
      weekdays: {
          position: 'absolute',
          left: 0,
          right: 0,
          top: 0,
          flexDirection: 'row',
          paddingTop: 15,
          paddingBottom: 7,
          ...Platform.select({
              ios: {
                  justifyContent: 'space-around',
                  marginLeft: 15,
                  marginRight: 15
              },
              default: {
                  justifyContent: 'space-between',
                  paddingLeft: 24,
                  paddingRight: 24
              }
          }),
          backgroundColor: appStyle.calendarBackground
      },
    header: {
      overflow: 'hidden',
      justifyContent: 'flex-end',
        position: 'absolute',
        height: '100%',
        width: '100%'
    },
    calendar: { // not in use
      flex: 1,
      borderBottomWidth: 1,
      borderColor: appStyle.separatorColor
    },
    knobContainer: {
      flex: 1,
      position: 'absolute',
      left: 0,
      right: 0,
      height: 24,
      bottom: 0,
      alignItems: 'center',
      backgroundColor: appStyle.calendarBackground
    },
    weekday: {
      width: 32,
      textAlign: 'center',
      color: appStyle.textSectionTitleColor,
      fontSize: appStyle.textDayHeaderFontSize,
        fontFamily: appStyle.textDayHeaderFontFamily
    },
    reservations: {
      flex: 1,
      marginTop: 104,
      backgroundColor: appStyle.backgroundColor
    },
    ...(theme[STYLESHEET_ID] || {})
  });
}
