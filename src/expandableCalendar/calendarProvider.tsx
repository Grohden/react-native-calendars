import _ from 'lodash';
import React, {Component} from 'react';
import {
  Animated, ImageStyle,
  StyleProp, TextStyle,
  TouchableOpacity,
  View,
  ViewStyle
} from 'react-native';
import XDate from 'xdate';

import * as dateUtils from '../date.utils';
import {xdateToData} from '../interface';
import styleConstructor from './style';
import CalendarContext from './calendarContext';
import { CalendarTheme } from '../types';
import * as commons from './commons';

const UPDATE_SOURCES = commons.UPDATE_SOURCES;
const TOP_POSITION = 65;

// eslint-disable-next-line @typescript-eslint/no-var-requires
const iconDown = require('../img/down.png');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const iconUp = require('../img/up.png');

type Props = {
  theme?: CalendarTheme;
  style?: ViewStyle;
  /** Initial date in 'yyyy-MM-dd' format. Default = Date() */
  date: string;
  /** Callback for date change event */
  onDateChanged: () => void;
  /** Callback for month change event */
  onMonthChange: () => void;
  /** Whether to show the today button */
  showTodayButton: boolean;
  /** Today button's top position */
  todayBottomMargin: number;
  /** Today button's style */
  todayButtonStyle: StyleProp<ViewStyle>;
  /** The opacity for the disabled today button (0-1) */
  disabledOpacity: number;
}

type State = {
  date: string;
  updateSource: string;
  buttonY: Animated.Value;
  disabled: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  buttonIcon: any; // Not sure what type images have on ts
  opacity: Animated.Value;
}

/**
 * @description: Calendar context provider component
 * @example: https://github.com/wix/react-native-calendars/blob/master/example/src/screens/expandableCalendar.js
 */
class CalendarProvider extends Component<Props, State> {
  static displayName = 'CalendarProvider';

  style: {
    [k: string]: ViewStyle| TextStyle | ImageStyle;
  }

  constructor(props: Props) {
    super(props);
    this.style = styleConstructor(props.theme);

    this.state = {
      date: this.props.date || new XDate().toString('yyyy-MM-dd'),
      updateSource: UPDATE_SOURCES.CALENDAR_INIT,
      buttonY: new Animated.Value(-props.todayBottomMargin || -TOP_POSITION),
      buttonIcon: this.getButtonIcon(props.date),
      disabled: false,
      opacity: new Animated.Value(1)
    };
  }

  componentDidUpdate(prevProps: Props) {
    if (prevProps.date !== this.props.date) {
      this.setDate(
        this.props.date,
        UPDATE_SOURCES.PROP_UPDATE
      );
    }
  }

  getProviderContextValue = () => {
    return {
      setDate: this.setDate,
      date: this.state.date,
      updateSource: this.state.updateSource,
      setDisabled: this.setDisabled
    };
  };

  setDate = (date: string, updateSource: string) => {
    const sameMonth = dateUtils.sameMonth(
      new XDate(date),
      new XDate(this.state.date)
    );

    this.setState({
      date,
      updateSource,
      buttonIcon: this.getButtonIcon(date)
    }, () => {
      this.animateTodayButton(date);
    });

    _.invoke(
      this.props,
      'onDateChanged',
      date,
      updateSource
    );

    if (!sameMonth) {
      _.invoke(
        this.props,
        'onMonthChange',
        xdateToData(new XDate(date)),
        updateSource
      );
    }
  }

  setDisabled = (disabled: boolean) => {
    if (this.props.showTodayButton && disabled !== this.state.disabled) {
      this.setState({ disabled });
      this.animateOpacity(disabled);
    }
  }

  getButtonIcon(date: string) {
    if (!this.props.showTodayButton) {
      return;
    }

    return this.isPastDate(date)
      ? iconDown
      : iconUp;
  }

  isPastDate(date: string) {
    const today = new XDate();
    const d =new XDate(date);

    if (today.getFullYear() > d.getFullYear()) {
      return true;
    }
    if (today.getFullYear() === d.getFullYear()) {
      if (today.getMonth() > d.getMonth()) {
        return true;
      }
      if (today.getMonth() === d.getMonth()) {
        if (today.getDate() > d.getDate()) {
          return true;
        }
      }
    }
    return false;
  }

  animateTodayButton(date: string) {
    if (this.props.showTodayButton) {
      const today = new XDate().toString('yyyy-MM-dd');
      const isToday = today === date;

      Animated.spring(this.state.buttonY, {
        toValue: isToday ? TOP_POSITION : -this.props.todayBottomMargin || -TOP_POSITION,
        tension: 30,
        friction: 8,
        useNativeDriver: true
      }).start();
    }
  }

  animateOpacity(disabled: boolean) {
    const {disabledOpacity} = this.props;
    if (disabledOpacity) {
      Animated.timing(this.state.opacity, {
        toValue: disabled ? disabledOpacity : 1,
        duration: 500
      }).start();
    }
  }

  onTodayPress = () => {
    const today = new XDate().toString('yyyy-MM-dd');
    this.setDate(today, UPDATE_SOURCES.TODAY_PRESS);
  }

  renderTodayButton() {
    const {
      disabled,
      opacity,
      buttonY,
      buttonIcon
    } = this.state;
    const locale = XDate.locales[XDate.defaultLocale];
    const todayString = (locale as { today?: string }).today || commons.todayString;
    const today = todayString.charAt(0).toUpperCase() + todayString.slice(1);

    return (
      <Animated.View style={[
        this.style.todayButtonContainer,
        { transform: [{translateY: buttonY}] }
      ]}>
        <TouchableOpacity
          style={[
            this.style.todayButton,
            this.props.todayButtonStyle
          ]}
          onPress={this.onTodayPress}
          disabled={disabled}>
          <Animated.Image
            style={[
              this.style.todayButtonImage,
              {opacity}
            ]}
            source={buttonIcon}/>
          <Animated.Text
            allowFontScaling={false}
            style={[
              this.style.todayButtonText,
              {opacity}
            ]}>
            {today}
          </Animated.Text>
        </TouchableOpacity>
      </Animated.View>
    );
  }

  render() {
    return (
      <CalendarContext.Provider value={this.getProviderContextValue()}>
        <View style={[{flex: 1}, this.props.style]}>
          {this.props.children}
        </View>
        {this.props.showTodayButton && this.renderTodayButton()}
      </CalendarContext.Provider>
    );
  }
}

export default CalendarProvider;
