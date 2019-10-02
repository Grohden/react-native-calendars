/* eslint-disable max-lines */
import React from 'react';
import {
  Animated,
  Dimensions,
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
  RefreshControlProps,
  Text,
  View,
  ViewStyle
} from 'react-native';
import XDate from 'xdate';

import * as dateUtils from '../date.utils';
import ReservationsList from './reservation-list/ReservationList';
import styleConstructor from './style';
import { VelocityTracker } from '../velocity-tracker';
import { parseDate, xdateToData } from '../interface';
import {
  CalendarMarkingProps,
  CalendarTheme,
  DateObject,
  DayComponentProps,
} from '../types';
import CalendarList from '../calendar-list';

const HEADER_HEIGHT = 104;
const KNOB_HEIGHT = 24;

type Props<T> = CalendarMarkingProps & {
  theme?: CalendarTheme;
  style?: ViewStyle;
  items: {
    [k: string]: T[];
  };
  loadItemsForMonth?: (date: DateObject) => void;
  onCalendarToggled?: (arg: boolean) => void;
  onDayPress?: (day: DateObject) => void;
  onDayChange?: (day: DateObject) => void;
  renderItem: (item: T) => JSX.Element;
  renderDay?: (day: DateObject | null, item: T | null) => JSX.Element;
  renderKnob?: () => JSX.Element;
  renderEmptyDay?: () => JSX.Element;
  renderEmptyDate: () => JSX.Element;
  renderEmptyData: () => JSX.Element;
  rowHasChanged: (r1: T, r2: T) => boolean;
  pastScrollRange?: number;
  futureScrollRange?: number;
  selected: string;
  minDate?: string;
  maxDate?: string;
  firstDay?: number;
  hideKnob?: boolean;
  monthFormat?: string;
  refreshControl?: React.ReactElement<RefreshControlProps>;
  onRefresh?: () => void;
  refreshing?: boolean;
  displayLoadingIndicator?: boolean;
  showWeekNumbers?: boolean;
  removeClippedSubviews?: boolean;
  dayComponent?: React.Component<DayComponentProps>;
  disabledByDefault?: boolean;
}

type State = {
  scrollY: Animated.Value;
  calendarIsReady: boolean;
  calendarScrollable: boolean;
  firstReservationLoad: boolean;
  selectedDay: XDate;
  topDay: XDate;
}

export default class Agenda<T>
  extends React.Component<Props<T>, State> {

  static displayName = 'Agenda'

  _isMounted = false

  headerState: string

  viewHeight: number

  viewWidth: number

  scrollTimeout: ReturnType<typeof setTimeout> | null

  styles: {
    [k: string]: ViewStyle;
  }

  currentMonth: XDate

  knobTracker: VelocityTracker

  knob: View | null = null

  list: ReservationsList<T> | null = null

  calendar: CalendarList | null = null

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  scrollPad: any | null = null

  constructor(props: Props<T>) {
    super(props);

    this.styles = styleConstructor(props.theme);

    const windowSize = Dimensions.get('window');
    this.viewHeight = windowSize.height;
    this.viewWidth = windowSize.width;
    this.scrollTimeout = null;
    this.headerState = 'idle';

    this.state = {
      scrollY: new Animated.Value(0),
      calendarIsReady: false,
      calendarScrollable: false,
      firstReservationLoad: false,
      selectedDay: parseDate(this.props.selected)
        || new XDate(true),
      topDay: parseDate(this.props.selected)
        || new XDate(true)
    };

    this.currentMonth = this.state.selectedDay.clone();
    this.onLayout = this.onLayout.bind(this);
    this.onScrollPadLayout = this.onScrollPadLayout.bind(this);
    this.onTouchStart = this.onTouchStart.bind(this);
    this.onTouchEnd = this.onTouchEnd.bind(this);
    this.onStartDrag = this.onStartDrag.bind(this);
    this.onSnapAfterDrag = this.onSnapAfterDrag.bind(this);
    this.generateMarkings = this.generateMarkings.bind(this);
    this.knobTracker = new VelocityTracker();
    this.state.scrollY.addListener(({ value }) =>
      this.knobTracker.add(value));
  }

  calendarOffset() {
    return 90 - (this.viewHeight / 2);
  }

  initialScrollPadPosition() {
    return Math.max(0, this.viewHeight - HEADER_HEIGHT);
  }

  setScrollPadPosition(y: number, animated: boolean) {
    this.scrollPad._component!.scrollTo({ x: 0, y, animated });
  }

  onScrollPadLayout() {
    /*
       * When user touches knob, the actual component that receives touch
       * events is a ScrollView. It needs to be scrolled to the bottom,
       * so that when user moves finger downwards, scroll position actually
       * changes (it would stay at 0, when scrolled to the top).
       */
    this.setScrollPadPosition(this.initialScrollPadPosition(), false);
    /*
       * delay rendering calendar in full height because otherwise
       * it still flickers sometimes
       */
    setTimeout(() => this.setState({
      calendarIsReady: true
    }), 0);
  }

  onLayout(event: LayoutChangeEvent) {
    this.viewHeight = event.nativeEvent.layout.height;
    this.viewWidth = event.nativeEvent.layout.width;
    this.forceUpdate();
  }

  onTouchStart() {
    this.headerState = 'touched';
    if (this.knob) {
      this.knob.setNativeProps({
        style: { opacity: 0.5 }
      });
    }
  }

  onTouchEnd() {
    if (this.knob) {
      this.knob.setNativeProps({
        style: { opacity: 1 }
      });
    }

    if (this.headerState === 'touched') {
      this.setScrollPadPosition(0, true);
      this.enableCalendarScrolling();
    }

    this.headerState = 'idle';
  }

  onStartDrag() {
    this.headerState = 'dragged';
    this.knobTracker.reset();
  }

  onSnapAfterDrag(e: NativeSyntheticEvent<NativeScrollEvent>) {
    // on Android onTouchEnd is not called if dragging was started
    this.onTouchEnd();
    const currentY = e.nativeEvent.contentOffset.y;
    this.knobTracker.add(currentY);
    const projectedY =
      currentY + this.knobTracker.estimateSpeed() * 250; /* ms */
    const maxY = this.initialScrollPadPosition();
    const snapY = (projectedY > maxY / 2) ? maxY : 0;
    this.setScrollPadPosition(snapY, true);

    if (snapY === 0) {
      this.enableCalendarScrolling();
    }
  }

  onVisibleMonthsChange(months: DateObject[]) {
    if (this.props.items && !this.state.firstReservationLoad) {
      if (this.scrollTimeout) {
        clearTimeout(this.scrollTimeout);
      }
      this.scrollTimeout = setTimeout(() => {
        if (this.props.loadItemsForMonth && this._isMounted) {
          this.props.loadItemsForMonth(months[0]);
        }
      }, 200);
    }
  }

  loadReservations(props: Props<T>) {
    if ((!props.items || !Object.keys(props.items).length)
      && !this.state.firstReservationLoad) {
      this.setState({
        firstReservationLoad: true
      }, () => {
        if (this.props.loadItemsForMonth) {
          this.props.loadItemsForMonth(
            xdateToData(this.state.selectedDay));
        }
      });
    }
  }

  componentWillMount() {
    this._isMounted = true;
    this.loadReservations(this.props);
  }

  componentWillUnmount() {
    this._isMounted = false;
  }

  componentWillReceiveProps(props: Props<T>) {
    if (props.items) {
      this.setState({
        firstReservationLoad: false
      });
    } else {
      this.loadReservations(props);
    }
  }

  enableCalendarScrolling() {
    this.setState({
      calendarScrollable: true
    });

    if (this.props.onCalendarToggled) {
      this.props.onCalendarToggled(true);
    }
    /*
     * Enlarge calendarOffset here as a workaround on iOS to force repaint.
     * Otherwise the month after current one or before current one remains
     * invisible. The problem is caused by overflow: 'hidden' style,
     * which we need for dragging to be performant.
     * Another working solution for this bug would be to set
     * removeClippedSubviews={false} in CalendarList listView, but that
     * might impact performance when scrolling
     * month list in expanded CalendarList.
     * Further info https://github.com/facebook/react-native/issues/1831
     */
    this.calendar!.scrollToDay(
      this.state.selectedDay,
      this.calendarOffset() + 1,
      true
    );
  }

  _chooseDayFromCalendar(day: DateObject) {
    this.chooseDay(day, !this.state.calendarScrollable);
  }

  chooseDay(d: DateObject, optimisticScroll: boolean) {
    const day = parseDate(d);

    this.setState({
      calendarScrollable: false,
      selectedDay: day.clone()
    });

    if (this.props.onCalendarToggled) {
      this.props.onCalendarToggled(false);
    }

    if (!optimisticScroll) {
      this.setState({
        topDay: day.clone()
      });
    }

    this.setScrollPadPosition(this.initialScrollPadPosition(), true);
    this.calendar!.scrollToDay(day, this.calendarOffset(), true);

    if (this.props.loadItemsForMonth) {
      this.props.loadItemsForMonth(xdateToData(day));
    }

    if (this.props.onDayPress) {
      this.props.onDayPress(xdateToData(day));
    }
  }

  renderReservations() {
    return (
      <ReservationsList
        refreshControl={ this.props.refreshControl }
        refreshing={ this.props.refreshing }
        onRefresh={ this.props.onRefresh }
        rowHasChanged={ this.props.rowHasChanged }
        renderItem={ this.props.renderItem }
        renderDay={ this.props.renderDay }
        renderEmptyDate={ this.props.renderEmptyDate }
        reservations={ this.props.items }
        selectedDay={ this.state.selectedDay }
        renderEmptyData={ this.props.renderEmptyData }
        topDay={ this.state.topDay }
        onDayChange={ this.onDayChange.bind(this) }
        onScroll={ () => {} }
        ref={ c => this.list = c }
        theme={ this.props.theme }
      />
    );
  }

  onDayChange(day: XDate) {
    const newDate = parseDate(day);
    const withAnimation = dateUtils.sameMonth(newDate, this.state.selectedDay);

    this.calendar!.scrollToDay(day, this.calendarOffset(), withAnimation);
    this.setState({
      selectedDay: parseDate(day)
    });

    if (this.props.onDayChange) {
      this.props.onDayChange(xdateToData(newDate));
    }
  }

  generateMarkings(): CalendarMarkingProps['markedDates'] {
    const markings = this.props.markedDates;
    let dates = markings && markings.dates;

    if (!dates) {
      dates = {};
      Object.entries(this.props.items || {}).forEach(([key, value]) => {
        if (value && value.length) {
          dates![key] = { marked: true };
        }
      });
    }

    const key = this.state.selectedDay.toString('yyyy-MM-dd');

    // Ts thinks that the type and date relation
    //  is lost here, that's why we cast here.
    return {
      type: markings!.type,
      dates: {
        ...dates!,
        [key]: {
          ...(dates[key] || {}),
          ...{ selected: true }
        }
      }
    } as CalendarMarkingProps['markedDates'];
  }

  render() {
    const agendaHeight = Math.max(0, this.viewHeight - HEADER_HEIGHT);
    const weekDaysNames = dateUtils.weekDayNames(this.props.firstDay);

    const weekdaysStyle = [this.styles.weekdays, {
      opacity: this.state.scrollY.interpolate({
        inputRange: [agendaHeight - HEADER_HEIGHT, agendaHeight],
        outputRange: [0, 1],
        extrapolate: 'clamp'
      }),
      transform: [{
        translateY: this.state.scrollY.interpolate({
          inputRange: [
            Math.max(0, agendaHeight - HEADER_HEIGHT),
            agendaHeight
          ],
          outputRange: [-HEADER_HEIGHT, 0],
          extrapolate: 'clamp'
        })
      }]
    }];

    const headerTranslate = this.state.scrollY.interpolate({
      inputRange: [0, agendaHeight],
      outputRange: [agendaHeight, 0],
      extrapolate: 'clamp'
    });

    const contentTranslate = this.state.scrollY.interpolate({
      inputRange: [0, agendaHeight],
      outputRange: [0, agendaHeight / 2],
      extrapolate: 'clamp'
    });

    const headerStyle = [
      this.styles.header,
      {
        bottom: agendaHeight,
        transform: [{ translateY: headerTranslate }]
      }
    ];

    if (!this.state.calendarIsReady) {
      // limit header height until everything is setup for calendar dragging
      headerStyle.push({ height: 0 });
      /*
           * fill header with appStyle.calendarBackground background to
           * reduce flickering
           */
      weekdaysStyle.push({ height: HEADER_HEIGHT });
    }

    const shouldAllowDragging =
      !this.props.hideKnob && !this.state.calendarScrollable;
    const scrollPadPosition =
      (shouldAllowDragging ? HEADER_HEIGHT : 0) - KNOB_HEIGHT;

    const scrollPadStyle = {
      position: 'absolute',
      width: 80,
      height: KNOB_HEIGHT,
      top: scrollPadPosition,
      left: (this.viewWidth - 80) / 2
    };

    let knob: null | JSX.Element =
      <View style={ this.styles.knobContainer } />;

    if (!this.props.hideKnob) {
      const knobView = this.props.renderKnob
        ? this.props.renderKnob()
        : (<View style={ this.styles.knob } />);

      knob = this.state.calendarScrollable ? null : (
        <View style={ this.styles.knobContainer }>
          <View ref={ c => this.knob = c }>
            { knobView }
          </View>
        </View>
      );
    }

    return (
      <View
        onLayout={ this.onLayout }
        style={ [
          this.props.style,
          { flex: 1, overflow: 'hidden' }
        ] }>
        <View style={ this.styles.reservations }>
          { this.renderReservations() }
        </View>
        <Animated.View style={ headerStyle }>
          <Animated.View style={ {
            flex: 1,
            transform: [{ translateY: contentTranslate }]
          } }>
            <CalendarList
              ref={ c => this.calendar = c }
              onLayout={ () => {
                this.calendar!.scrollToDay(
                  this.state.selectedDay.clone(),
                  this.calendarOffset(),
                  false
                );
              } }
              calendarWidth={ this.viewWidth }
              theme={ this.props.theme }
              onVisibleMonthsChange={
                this.onVisibleMonthsChange.bind(this)
              }
              minDate={ this.props.minDate }
              maxDate={ this.props.maxDate }
              current={ this.currentMonth }
              markedDates={ this.generateMarkings() }
              removeClippedSubviews={
                this.props.removeClippedSubviews
              }
              onDayPress={ this._chooseDayFromCalendar.bind(this) }
              scrollEnabled={ this.state.calendarScrollable }
              hideExtraDays={ this.state.calendarScrollable }
              firstDay={ this.props.firstDay }
              monthFormat={ this.props.monthFormat }
              pastScrollRange={ this.props.pastScrollRange }
              futureScrollRange={ this.props.futureScrollRange }
              dayComponent={ this.props.dayComponent }
              disabledByDefault={ this.props.disabledByDefault }
              displayLoadingIndicator={
                this.props.displayLoadingIndicator
              }
              showWeekNumbers={ this.props.showWeekNumbers }
            />
          </Animated.View>
          { knob }
        </Animated.View>
        <Animated.View style={ weekdaysStyle }>
          { this.props.showWeekNumbers
            ? (
              <Text
                allowFontScaling={ false }
                style={ this.styles.weekday }
                numberOfLines={ 1 }
              />
            ) : null
          }
          { weekDaysNames.map((day, index) => (
            <Text
              allowFontScaling={ false }
              key={ day + index }
              style={ this.styles.weekday }
              numberOfLines={ 1 }>
              { day }
            </Text>
          )) }
        </Animated.View>
        <Animated.ScrollView
          ref={ (c: unknown) => this.scrollPad = c }
          overScrollMode='never'
          showsHorizontalScrollIndicator={ false }
          showsVerticalScrollIndicator={ false }
          style={ scrollPadStyle }
          scrollEventThrottle={ 1 }
          scrollsToTop={ false }
          onTouchStart={ this.onTouchStart }
          onTouchEnd={ this.onTouchEnd }
          onScrollBeginDrag={ this.onStartDrag }
          onScrollEndDrag={ this.onSnapAfterDrag }
          onScroll={ Animated.event(
            [{
              nativeEvent: {
                contentOffset: { y: this.state.scrollY }
              }
            }],
            { useNativeDriver: true }
          ) }>
          <View
            style={ { height: agendaHeight + KNOB_HEIGHT } }
            onLayout={ this.onScrollPadLayout }
          />
        </Animated.ScrollView>
      </View>
    );
  }
}
