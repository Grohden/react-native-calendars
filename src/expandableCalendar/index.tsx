import _ from 'lodash';
import React, { Component } from 'react';
import {
  PanResponder,
  Animated,
  View,
  Text,
  Image,
  ViewStyle,
  TextStyle,
  PanResponderInstance,
  ImageStyle,
  GestureResponderEvent,
  PanResponderGestureState,
  ImageSourcePropType
} from 'react-native';
import XDate from 'xdate';
import { CALENDAR_KNOB } from '../testIDs';

import * as dateUtils from '../date.utils';
import { parseDate } from '../interface';
import styleConstructor from './style';
import CalendarList, { CalendarListProps } from '../calendar-list';
import asCalendarConsumer, { CalendarConsumerProps } from './asCalendarConsumer';
import Week from './week';
import * as commons from './commons';
import { CalendarMarkingProps, DateObject } from '../types';

const UPDATE_SOURCES = commons.UPDATE_SOURCES;
const POSITIONS = {
  CLOSED: 'closed',
  OPEN: 'open'
};
const SPEED = 20;
const BOUNCINESS = 6;
const CLOSED_HEIGHT = 120; // header + 1 week
const WEEK_HEIGHT = 46;
const KNOB_CONTAINER_HEIGHT = 20;
const HEADER_HEIGHT = 68;
const DAY_NAMES_PADDING = 24;

type Props = CalendarListProps & CalendarConsumerProps & {
  /** the initial position of the calendar ('open' or 'closed') */
  initialPosition?: 'open' | 'closed';
  /** an option to disable the pan gesture and disable the opening and closing of the calendar (initialPosition will persist)*/
  disablePan?: boolean;
  /** whether to hide the knob  */
  hideKnob?: boolean;
  /** source for the left arrow image */
  leftArrowImageSource: ImageSourcePropType;
  /** source for the right arrow image */
  rightArrowImageSource: ImageSourcePropType;
  /** whether to have shadow/elevation for the calendar */
  allowShadow?: boolean;
}

type State = {
  deltaY: Animated.Value;
  headerDeltaY: Animated.Value;
  position: 'open' | 'closed';
}

/**
 * @description: Expandable calendar component
 * @extends: CalendarList
 * @extendslink: docs/CalendarList
 * @example: https://github.com/wix/react-native-calendars/blob/master/example/src/screens/expandableCalendar.js
 */
class ExpandableCalendar extends Component<Props, State> {
  static displayName = 'ExpandableCalendar';

  static positions = POSITIONS;

  style: {
    [k: string]: ViewStyle | TextStyle | ImageStyle;
    arrowImage: ImageStyle;
  }

  closedHeight: number

  numberOfWeeks: number

  openHeight: number

  _height: number

  _wrapperStyles: {
    style: ViewStyle;
  }

  _headerStyles: {
    style: ViewStyle;
  }

  _weekCalendarStyles: {
    style: ViewStyle;
  }

  calendar: CalendarList | null = null

  visibleMonth: number | null = null

  initialDate: string

  // This is actually View.Animated
  wrapper: View | null = null

  // This is actually View.Animated
  header: View | null = null

  // This is actually View.Animated
  weekCalendar: View | null = null

  headerStyleOverride = {
    'stylesheet.calendar.header': {
      week: {
        marginTop: 7,
        marginBottom: -4, // reduce space between dayNames and first line of dates
        flexDirection: 'row',
        justifyContent: 'space-around'
      }
    }
  };

  panResponder: PanResponderInstance

  constructor(props: Props) {
    super(props);

    this.style = styleConstructor(props.theme);
    this.closedHeight = CLOSED_HEIGHT + (props.hideKnob ? 0 : KNOB_CONTAINER_HEIGHT);
    this.numberOfWeeks = this.getNumberOfWeeksInMonth(
      new XDate(this.props.context.date)
    );
    this.openHeight = this.getOpenHeight();

    const { initialPosition = 'closed' } = props;
    const startHeight = initialPosition === 'closed'
      ? this.closedHeight
      : this.openHeight;

    this._height = startHeight;
    this._wrapperStyles = { style: {} };

    this._headerStyles = {
      style: {
        top: initialPosition === 'closed' ? 0 : -HEADER_HEIGHT
      }
    };

    this._weekCalendarStyles = { style: {} };
    this.visibleMonth = this.getMonth(this.props.context.date);
    this.initialDate = props.context.date; // should be set only once!!!

    this.state = {
      deltaY: new Animated.Value(startHeight),
      headerDeltaY: new Animated.Value(
        initialPosition === 'closed'
          ? 0
          : -HEADER_HEIGHT
      ),
      position: initialPosition
    };

    this.panResponder = PanResponder.create({
      onMoveShouldSetPanResponder: this.handleMoveShouldSetPanResponder,
      onPanResponderGrant: this.handlePanResponderGrant,
      onPanResponderMove: this.handlePanResponderMove,
      onPanResponderRelease: this.handlePanResponderEnd,
      onPanResponderTerminate: this.handlePanResponderEnd
    });
  }

  // componentDidMount() {
  //   this.updateNativeStyles();
  // }
  getArrowSources() {
    const {
      leftArrowImageSource = require('../calendar/img/previous.png'),
      rightArrowImageSource = require('../calendar/img/next.png')
    } = this.props;

    return {
      leftArrowImageSource,
      rightArrowImageSource
    };
  }

  componentDidUpdate(prevProps: Props) {
    const { date } = this.props.context;
    if (date !== prevProps.context.date) {
      // date was changed from AgendaList, arrows or scroll
      this.scrollToDate(date);
    }
  }

  updateNativeStyles() {
    if(this.wrapper) {
      this.wrapper.setNativeProps(this._wrapperStyles);
    }

    const { horizontal = true } = this.props;

    if (!horizontal) {
      this.header && this.header.setNativeProps(this._headerStyles);
    } else {
      this.weekCalendar && this.weekCalendar.setNativeProps(this._weekCalendarStyles);
    }
  }

  /** Scroll */

  scrollToDate(date: string) {
    if (this.calendar) {
      const { horizontal = true } = this.props;

      if (!horizontal) {
        this.calendar!.scrollToDay(new XDate(date), 0, true);

        return;
      }

      // don't scroll if the month is already visible
      if (this.getMonth(date) !== this.visibleMonth) {
        this.calendar!.scrollToMonth(new XDate(date));
      }
    }
  }

  scrollPage(next: boolean) {
    const { horizontal = true } = this.props;

    if (horizontal) {
      const d = parseDate(this.props.context.date)!;

      if (this.state.position === 'open') {
        d.setDate(1);
        d.addMonths(next ? 1 : -1);
      } else {
        const { firstDay = 0 } = this.props;
        let dayOfTheWeek = d.getDay();
        if (dayOfTheWeek < firstDay && firstDay > 0) {
          dayOfTheWeek = 7 + dayOfTheWeek;
        }
        const firstDayOfWeek = (next ? 7 : -7) - dayOfTheWeek + firstDay;
        d.addDays(firstDayOfWeek);
      }

      this.props.context.setDate(
        this.getDateString(d),
        UPDATE_SOURCES.PAGE_SCROLL
      );
    }
  }

  /** Utils */
  getOpenHeight() {
    const { horizontal = true } = this.props;

    if (!horizontal) {
      return Math.max(commons.screenHeight, commons.screenWidth);
    }
    return CLOSED_HEIGHT
      + (WEEK_HEIGHT * (this.numberOfWeeks - 1))
      + (this.props.hideKnob ? 12 : KNOB_CONTAINER_HEIGHT);
  }

  getDateString(date: XDate) {
    return date.toString('yyyy-MM-dd');
  }

  getYear(date: string) {
    const d = new XDate(date);
    return d.getFullYear();
  }

  getMonth(date: string) {
    const d = new XDate(date);
    // getMonth() returns the month of the year (0-11). Value is zero-index, meaning Jan=0, Feb=1, Mar=2, etc.
    return d.getMonth() + 1;
  }

  getNumberOfWeeksInMonth(month: XDate) {
    const days = dateUtils.page(month, this.props.firstDay);
    return days.length / 7;
  }

  getMarkedDates(): CalendarMarkingProps['markedDates'] {
    const { context, markedDates } = this.props;

    if (markedDates) {
      const marked = _.cloneDeep(markedDates.dates);

      if (marked[context.date]) {
        (marked[context.date] as { selected: true }).selected = true;
      } else {
        marked[context.date] = { selected: true };
      }

      return {
        ...markedDates!,
        dates: marked
      } as CalendarMarkingProps['markedDates'];
    }

    return {
      ...(markedDates || {})!,
      [context.date]: { selected: true }
    } as CalendarMarkingProps['markedDates'];
  }

  shouldHideArrows() {
    const { horizontal = true } = this.props;

    if (!horizontal) {
      return true;
    }
    return this.props.hideArrows || false;
  }

  isLaterDate(date1: DateObject, date2: string) {
    if (date1.year > this.getYear(date2)) {
      return true;
    }
    if (date1.year === this.getYear(date2)) {
      if (date1.month > this.getMonth(date2)) {
        return true;
      }
    }
    return false;
  }

  /** Pan Gesture */

  handleMoveShouldSetPanResponder = (
    _: GestureResponderEvent,
    gestureState: PanResponderGestureState
  ) => {
    const {
      horizontal = true,
      disablePan
    } = this.props;

    if (disablePan) {
      return false;
    }

    if (!horizontal && this.state.position === 'open') {
      // disable pan detection when vertical calendar is open to allow calendar scroll
      return false;
    }

    if (this.state.position === 'closed' && gestureState.dy < 0) {
      // disable pan detection to limit to closed height
      return false;
    }
    return gestureState.dy > 5 || gestureState.dy < -5;
  };

  handlePanResponderGrant = () => {

  };

  handlePanResponderMove = (
    _: GestureResponderEvent,
    gestureState: PanResponderGestureState
  ) => {
    const { horizontal = true } = this.props;

    // limit min height to closed height
    this._wrapperStyles.style.height = Math.max(this.closedHeight, this._height + gestureState.dy);

    if (!horizontal) {
      // vertical CalenderList header
      this._headerStyles.style.top = Math.min(Math.max(-gestureState.dy, -HEADER_HEIGHT), 0);
    } else {
      // horizontal Week view
      if (this.state.position === 'closed') {
        this._weekCalendarStyles.style.opacity = Math.min(1, Math.max(1 - gestureState.dy / 100, 0));
      }
    }

    this.updateNativeStyles();
  };

  handlePanResponderEnd = () => {
    this._height = this._wrapperStyles.style.height as number;
    this.bounceToPosition();
  };

  /** Animated */

  bounceToPosition(toValue?: number) {
    if (!this.props.disablePan) {
      const { deltaY } = this.state;
      const threshold = this.openHeight / 1.75;

      let isOpen = this._height >= threshold;
      const newValue = isOpen ? this.openHeight : this.closedHeight;

      deltaY.setValue(this._height); // set the start position for the animated value
      this._height = toValue || newValue;
      isOpen = this._height >= threshold; // re-check after this._height was set

      Animated.spring(deltaY, {
        toValue: this._height,
        speed: SPEED,
        bounciness: BOUNCINESS
      }).start(this.onAnimatedFinished);

      this.setPosition();
      this.closeHeader(isOpen);
      this.resetWeekCalendarOpacity(isOpen);
    }
  }

  onAnimatedFinished = ({ finished }: { finished: boolean }) => {
    if (finished) {
      // this.setPosition();
    }
  }

  setPosition() {
    const isClosed = this._height === this.closedHeight;
    this.setState({
      position: isClosed ? 'closed' : 'open'
    });
  }

  resetWeekCalendarOpacity(isOpen: boolean) {
    this._weekCalendarStyles.style.opacity = isOpen ? 0 : 1;
    this.updateNativeStyles();
  }

  closeHeader(isOpen: boolean) {
    const { headerDeltaY } = this.state;
    const { horizontal = true } = this.props;

    // set the start position for the animated value
    headerDeltaY.setValue(
      this._headerStyles.style.top as number
    );

    if (!horizontal && !isOpen) {
      Animated.spring(headerDeltaY, {
        toValue: 0,
        speed: SPEED / 10,
        bounciness: 1
      }).start();
    }
  }

  /** Events */

  onPressArrowLeft = () => {
    this.scrollPage(false);
  }
  onPressArrowRight = () => {
    this.scrollPage(true);
  }

  // {year: 2019, month: 4, day: 22, timestamp: 1555977600000, dateString: "2019-04-23"}
  onDayPress = (value: DateObject) => {
    _.invoke(this.props.context, 'setDate', value.dateString, UPDATE_SOURCES.DAY_PRESS);

    setTimeout(() => { // to allows setDate to be completed
      if (this.state.position === 'open') {
        this.bounceToPosition(this.closedHeight);
      }
    }, 0);
  }

  onVisibleMonthsChange = (value: DateObject[]) => {
    if (this.visibleMonth !== value[0].month) {
      this.visibleMonth = value[0].month; // equivalent to this.getMonth(value[0].dateString)

      // for horizontal scroll
      const { date, updateSource } = this.props.context;

      if (this.visibleMonth !== this.getMonth(date) && updateSource !== UPDATE_SOURCES.DAY_PRESS) {
        const next = this.isLaterDate(value[0], date);
        this.scrollPage(next);
      }

      // FIXME: cancel timeouts that were scheduled
      // updating openHeight
      setTimeout(() => { // to wait for setDate() call in horizontal scroll (this.scrollPage())
        const numberOfWeeks = this.getNumberOfWeeksInMonth(
          parseDate(this.props.context.date)!
        );

        if (numberOfWeeks !== this.numberOfWeeks) {
          this.numberOfWeeks = numberOfWeeks;
          this.openHeight = this.getOpenHeight();

          if (this.state.position === 'open') {
            this.bounceToPosition(this.openHeight);
          }
        }
      }, 0);
    }
  }

  /** Renders */

  renderWeekDaysNames() {
    const weekDaysNames = dateUtils.weekDayNames(this.props.firstDay);

    return (
      <View
        style={ [
          this.style.weekDayNames,
          {
            paddingLeft: _.get(
              this.props,
              'calendarStyle.paddingLeft'
            ) + 6 || DAY_NAMES_PADDING,
            paddingRight: _.get(
              this.props,
              'calendarStyle.paddingRight'
            ) + 6 || DAY_NAMES_PADDING
          }
        ] }
      >
        { weekDaysNames.map((day, index) => (
          <Text
            allowFontScaling={ false }
            key={ day + index }
            style={ this.style.weekday }
            numberOfLines={ 1 }>
            { day }
          </Text>
        )) }
      </View>
    );
  }

  renderHeader() {
    const monthYear = new XDate(this.props.context.date).toString('MMMM yyyy');

    return (
      <Animated.View
        ref={ (e: View) => this.header = e }
        style={ [this.style.header, {
          height: HEADER_HEIGHT,
          top: this.state.headerDeltaY
        }] }
        pointerEvents={ 'none' }
      >
        <Text allowFontScaling={ false }
          style={ this.style.headerTitle }>{ monthYear }</Text>
        { this.renderWeekDaysNames() }
      </Animated.View>
    );
  }

  renderWeekCalendar() {
    const { position } = this.state;

    return (
      <Animated.View
        ref={ (e: View) => this.weekCalendar = e }
        style={ {
          position: 'absolute',
          left: 0,
          right: 0,
          // align row on top of calendar's first row
          top: HEADER_HEIGHT + (commons.isAndroid ? 8 : 4),
          opacity: position === 'open' ? 0 : 1
        } }
        pointerEvents={ position === 'closed' ? 'auto' : 'none' }
      >
        <Week
          { ...this.props }
          current={ this.props.context.date }
          onDayPress={ this.onDayPress }
          markedDates={ this.getMarkedDates() }
          style={ this.props.calendarStyle }
        />
      </Animated.View>
    );
  }

  renderKnob() {
    // TODO: turn to TouchableOpacity with onPress that closes it
    return (
      <View style={ this.style.knobContainer } pointerEvents={ 'none' }>
        <View style={ this.style.knob } testID={ CALENDAR_KNOB } />
      </View>
    );
  }

  renderArrow = (direction: 'left' | 'right') => {
    if (_.isFunction(this.props.renderArrow)) {
      this.props.renderArrow(direction);
    }

    const {
      rightArrowImageSource,
      leftArrowImageSource
    } = this.getArrowSources();

    return (
      <Image
        style={ this.style.arrowImage }
        source={
          direction === 'right'
            ? rightArrowImageSource
            : leftArrowImageSource
        }
      />
    );
  }

  render() {
    const {
      style,
      hideKnob,
      horizontal = true,
      allowShadow = true,
      theme
    } = this.props;
    const { deltaY, position } = this.state;
    const isOpen = position === 'open';
    const themeObject = Object.assign(this.headerStyleOverride, theme);

    return (
      <View style={ [allowShadow && this.style.containerShadow, style] }>
        <Animated.View
          ref={ (e: View) => {
            this.wrapper = e;
          } }
          style={ { height: deltaY } }
          { ...this.panResponder.panHandlers }
        >
          <CalendarList
            testID='calendar'
            { ...this.props }
            theme={ themeObject }
            ref={ r => this.calendar = r }
            current={ this.initialDate }
            onDayPress={ this.onDayPress }
            onVisibleMonthsChange={ this.onVisibleMonthsChange }
            pagingEnabled
            scrollEnabled={ isOpen }
            markedDates={ this.getMarkedDates() }
            hideArrows={ this.shouldHideArrows() }
            onPressArrowLeft={ this.onPressArrowLeft }
            onPressArrowRight={ this.onPressArrowRight }
            hideExtraDays={ !horizontal }
            renderArrow={ this.renderArrow }
            staticHeader
          />
          { horizontal && this.renderWeekCalendar() }
          { !hideKnob && this.renderKnob() }
          { !horizontal && this.renderHeader() }
        </Animated.View>
      </View>
    );
  }
}

export default asCalendarConsumer(ExpandableCalendar);
