import React, { Component, Fragment } from 'react';
import styled from 'styled-components';
import { Typography, Button, notification, Row, Col, Divider, Badge, Result } from 'antd';
import { QRCode } from 'react-qr-svg';
import { Link } from 'react-router-dom';
import { isEmpty, get } from 'lodash';
import Sound from 'react-sound';

import {
    Container,
} from '../components';

import clockTicking from '../static/clock-ticking.mp3';
import bell from '../static/bell.mp3';

import shot1 from '../static/shot1.mp3';
import shot2 from '../static/shot2.mp3';
import shot3 from '../static/shot3.mp3';
import shot4 from '../static/shot4.mp3';
import shot6 from '../static/shot6.mp3';

const shotList = [
    shot1, shot2, shot3,
    shot4, shot6,
];

const { Title } = Typography;
const ButtonGroup = Button.Group;

const StyledContainer = styled(Container)`
    text-align: center;
`

const SmallTitle = styled.small`
    font-size: 13px;
    text-transform: uppercase;
    letter-spacing: 10px;
    display: block;
`;

const PlayerState = styled.div`
    @keyframes shoot {
        from {
            transform: scale(1.1);
            background-color: #ff6600;
        }
        to {
            transform: scale(1.0);
            background-color: #dbe5ef;
        }
    }
    height: 200px;
    width: 200px;
    background-color: #dbe5ef;
    pointer-events: none;
    margin: 0 auto;
    line-height: 200px;
    text-align: center;
    margin-bottom: 5px;
    animation-name: shoot;
    animation-duration: 0.3s;
    animation-timing-function: cubic-bezier(0.175, 0.885, 0.32, 1.275);
    animation-iteration-count: 1;
    &.WAITING {
        background-color: #b6ffa8;
    }
`;

const errorNotification = (message) => {
    notification.error({ message, duration: 2 });
};

const infoNotification = (message) => {
    notification.info({ message, duration: 2 });
};

class Room extends Component {
    state = {
        roomName: this.props.match.params.roomId || '?',
        gameState: 'IDLE',
        players: {},
        playerOneConnected: false,
        playerTwoConnected: false,
        playerOneTrigger: 0,
        playerTwoTrigger: 0,
        urlPrefix: window.location.origin,
        playersConnected: 0,
        message: {},
    }

    pingInterval = {};

    componentDidUpdate(prevProps, prevState) {
        //! polączenie obu graczy naraz
        const playerOneSelector = 'players.player1.connected';
        const playerTwoSelector = 'players.player2.connected';
        const playerOneConnected = !get(prevState, playerOneSelector, false) &&  get(this.state, playerOneSelector, false);
        const playerOneDisonnected = get(prevState, playerOneSelector, false) &&  !get(this.state, playerOneSelector, false);
        const playerTwoConnected = !get(prevState, playerTwoSelector, false) &&  get(this.state, playerTwoSelector, false);
        const playerTwoDisonnected = get(prevState, playerTwoSelector, false) &&  !get(this.state, playerTwoSelector, false);

        if (playerOneConnected || playerOneDisonnected) {
            this.setState({ playerOneConnected })
        }
        if (playerTwoConnected || playerTwoDisonnected) {
            this.setState({ playerTwoConnected })
        }

        if (playerOneConnected || playerTwoConnected) {
            const connectedNumber = playerOneConnected && playerTwoConnected ? 2 : 1;
            this.setState((state) => ({ playersConnected: state.playersConnected + connectedNumber }))
        }
        if (playerOneDisonnected || playerTwoDisonnected) {
            const connectedNumber = playerOneConnected && playerTwoConnected ? 2 : 1;
            this.setState((state) => ({ playersConnected: state.playersConnected - connectedNumber }))
        }
        
        //! autoplay
        const playerOneReady = get(this.state, 'players.player1.playerState', false) === 'WAITING';
        const playerTwoReady = get(this.state, 'players.player2.playerState', false) === 'WAITING';
        if (playerOneReady &&  playerTwoReady && this.state.gameState === 'IDLE') {
            console.log('this.state', this.state);
            this.startGame();
        }

        //! czyszczenie danych
        const endgameToIdle = prevState.gameState === 'ENDGAME' && this.state.gameState === 'IDLE';
        const endgameToWarmup = prevState.gameState === 'ENDGAME' && this.state.gameState === 'WARMUP';
        if (endgameToIdle || endgameToWarmup) {
            this.setState({ message: {} });
        }

        if (prevState.gameState !== 'SHOOTOUT' && this.state.gameState === 'SHOOTOUT') {
            const audio = new Audio(bell);
            audio.play();
        }
    }

    componentDidMount() {
        this.props.socket.emit('JOIN_ROOM', { roomName: this.state.roomName }, ({ status, roomName, errorMessage }) => {
            if (status === 'OK') {
                infoNotification(`Dołączono do pokoju ${roomName}!`)
            } else {
                this.props.history.push('/');
                errorNotification(errorMessage);
            }
        });
        this.props.socket.on('ROOM_UPDATE', (newRoomData) => {
            this.setState({ ...newRoomData })
        });
        this.props.socket.on('DEBUG_ACTION', (stuff) => {
            console.log('DEBUG_ACTION', stuff);
        });
        this.props.socket.on('PEWPEW', this.shootBlanks);
        this.pingInterval = setInterval(() => {
            this.props.socket.emit('PING_PLAYERS', { roomName: this.state.roomName });
        }, 2000);
    }

    getPlayerProfile = (playerNo) => {
        const player = get(this.state, `players.player${playerNo}`);
        const isConnected = get(player, `connected`, false);
        const playerLink = `/joinGame/${this.state.roomName}/${playerNo}`;
        if (isConnected) {
            const ping = get(player, `ping`, 0);
            const trigger = Number(playerNo) === 1 ? 'playerOneTrigger' : 'playerTwoTrigger';
            let pingColor = '#52c41a';
            if (ping > 20) {
                pingColor = '#ff8d3f'
            }
            if (ping > 50) {
                pingColor = '#ff3f3f'
            }
            return (
                <Fragment>
                    <Badge
                        overflowCount={999}
                        count={ping}
                        showZero
                        style={{ backgroundColor: pingColor }}
                    >
                        <PlayerState
                            key={`Player_${playerNo}_${this.state[trigger]}`}
                            className={get(player, `playerState`, 'IDLE')}
                        >
                            połączony
                        </PlayerState>
                    </Badge>
                    <SmallTitle>gracz {playerNo}</SmallTitle>
                </Fragment>
            )
        }
        return (
            <Fragment>
                <Link to={playerLink} target='_blank'>
                    <QRCode
                        bgColor='#FFFFFF'
                        fgColor='#001529'
                        level='Q'
                        style={{ width: 200 }}
                        value={encodeURI(this.state.urlPrefix + playerLink)}
                    />
                </Link>
                <SmallTitle>gracz {playerNo}</SmallTitle>
            </Fragment>
        )
    }

    startGame = () => {
        this.props.socket.emit('START_GAME', { roomName: this.state.roomName });
    }

    randomShot = () => shotList[Math.floor(Math.random() * shotList.length)]

    shootBlanks = (playerNo) => {
        const trigger = Number(playerNo) === 1 ? 'playerOneTrigger' : 'playerTwoTrigger';
        const audio = new Audio(this.randomShot());
        audio.play();
        this.setState((state) => ({
            [trigger]: state[trigger] + 1,
        }))
    }

    render() {
        let gameHeader;
        switch (this.state.gameState) {
            case 'WARMUP':
                gameHeader = (
                    <Fragment>
                        <Title>Przygotować się</Title>
                        <Divider style={{ margin: '50px 0'}} />
                    </Fragment>
                )
                break;
            case 'SHOOTOUT':
                gameHeader = (
                    <Fragment>
                        <Title>STRZELAJ!</Title>
                        <Divider style={{ margin: '50px 0'}} />
                    </Fragment>
                )
                break;
            default:
                break;
        }
        const message = !isEmpty(this.state.message) ? (
            <Result
                status={this.state.message.type}
                title={`Wygrał gracz ${this.state.message.winner}`}
                subTitle={this.state.message.description}
            />
        ) : '';
        const soundWarmup = this.state.gameState === 'WARMUP' ? (
            <Sound
                url={clockTicking}
                playStatus={'PLAYING'}
            />
        ) : '';
        return (
            <StyledContainer>
                <Title level={3} style={{ marginTop: '30px'}}>
                    <SmallTitle>jesteś w pokoju</SmallTitle>
                    {this.state.roomName}
                </Title>
                <Divider style={{ margin: '50px 0'}} />
                {gameHeader}
                {message}
                <Row>
                    <Col span={12}>
                        {this.getPlayerProfile(1)}
                    </Col>
                    <Col span={12} style={{ borderLeft: '1px solid #e8e8e8'}}>
                        {this.getPlayerProfile(2)}
                    </Col>
                </Row>
                {/* <Button
                    icon='fire'
                    type="danger"
                    disabled={this.state.playersConnected !== 2}
                    size="large"
                    style={{
                        marginTop: '30px'
                    }}
                    onClick={this.startGame}
                >
                    rozpocznij grę
                </Button> */}
                <Divider style={{ margin: '50px 0 30px 0'}} />
                <ButtonGroup>
                    <Button icon='poweroff' onClick={() => { this.props.history.push('/') }}>
                        opuść pokój
                    </Button>
                </ButtonGroup>
                {soundWarmup}
            </StyledContainer>
        );
    }
}
export { Room };