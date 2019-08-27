import React, { Component } from 'react';
import styled from 'styled-components';
import mobile from 'is-mobile';
import { Typography, notification, Button } from 'antd';
import { throttle } from 'lodash';

import {
    Container,
} from '../components';

const { Title } = Typography;

const StyledContainer = styled(Container)`
    text-align: center;
    h4 {
        word-break: break-word;
        user-select: none;
        pointer-events: none;
        span {
            margin-bottom: 15px;
            user-select: none;
            pointer-events: none;
        }
    }
`

const SmallTitle = styled.small`
    font-size: 13px;
    text-transform: uppercase;
    letter-spacing: 10px;
    display: block;
    user-select: none;
    pointer-events: none;
`;

const BigTrigger = styled.div`
    width: 100%;
    height: 200px;
    background-color: red;
    &:active,
    &.active {
        background-color: black;
    }
`;

const errorNotification = (message) => {
    notification.error({ message, duration: 2 });
};

const infoNotification = (message) => {
    notification.info({ message, duration: 2 });
};

class GameRoom extends Component {
    state = {
        roomName: this.props.match.params.roomId || '?',
        playerId: this.props.match.params.playerId || '?',
        playerState: 'IDLE',
    }
    componentDidMount() {
        const playData = {
            roomName: this.state.roomName,
            playerId: this.state.playerId,
        };
        this.props.socket.emit('PLAYER_JOIN_ROOM', playData, this.joinCallback);
        window.addEventListener('beforeunload', () => {
            this.props.socket.emit('PLAYER_LEAVE_ROOM', playData);
        });
        this.props.socket.on('PING_REQUEST', () => {
            this.props.socket.emit('PONG', playData);
        });
        this.props.socket.on('ROOM_UPDATE', (newRoomData) => {
            this.setState({ ...newRoomData })
        });
        window.onresize = this.onResizeHandler; 
    }

    onResizeHandler = () => {
        // eslint-disable-next-line no-restricted-globals
        const cavemanIsFullscreen = window.outerWidth === screen.availWidth && window.outerHeight === screen.availHeight;
        const isFullscreen = cavemanIsFullscreen || document.fullScreen || document.mozFullScreen || document.webkitIsFullScreen;
        if (isFullscreen) {
            window.addEventListener("devicemotion", this.handleDeviceMotionFunction, true);
        } else {
            window.removeEventListener("devicemotion", this.handleDeviceMotionFunction, true);
        }
        this.setState({
            isFullscreen,
        })
    }

    goToFullScreen = () => {
        const request = document.documentElement.requestFullscreen();
        request.then(() => {
            window.screen.orientation.lock('portrait-primary');
        });
    }

    startGame = () => {
        this.props.socket.emit('START_GAME', { roomName: this.state.roomName });
    }

    handleDeviceMotion = (event) => {
        // ! debug data
        const acc = Math.abs(event.accelerationIncludingGravity.x) + event.accelerationIncludingGravity.y + Math.abs(event.accelerationIncludingGravity.z);
        // this.props.socket.emit('DEBUG', { roomName: this.state.roomName, acc, state: this.state.playerState });
        let playerState;
        if (Math.abs(acc) > 10 && this.state.playerState === 'WAITING') {
            this.shoot();
            playerState = 'IDLE';
        } else if (acc < -6 && this.state.playerState !== 'WAITING') {
            playerState = 'WAITING';
        } else if (acc > -5 && this.state.playerState !== 'IDLE') {
            playerState = 'IDLE';
        }
        const playData = {
            roomName: this.state.roomName,
            playerId: this.state.playerId,
            playerState,
        };
        !!playerState && this.props.socket.emit('UPDATE_PLAYER_STATE', playData);
        !!playerState && this.setState({ playerState });
    }

    handleDeviceMotionFunction = throttle(this.handleDeviceMotion, 200);

    joinCallback = ({ status, roomName, errorMessage }) => {
        if (status === 'OK') {
            infoNotification(`Dołączono do pokoju ${roomName}!`)
        } else {
            this.props.history.push('/');
            errorNotification(errorMessage);
        }
    }

    shoot = () => {
        navigator.vibrate([150]);
        const playData = {
            roomName: this.state.roomName,
            playerId: this.state.playerId,
        };
        this.props.socket.emit('PLAYER_SHOT', playData);
    }

    render() {
        const isMobile = mobile();
        if (!isMobile) {
            return (
                <StyledContainer>
                    wygląda na to, że aktualnie gra działa tylko na telefonach :(
                </StyledContainer>
            )
        }
        return (
            <StyledContainer>
                <Title level={4}>
                    <SmallTitle>grasz w pokoju</SmallTitle>
                    {this.state.roomName}
                </Title>
                <Button
                    disabled={this.state.isFullscreen}
                    onClick={this.goToFullScreen}
                >
                    Przygotuj się
                </Button>
                <Button
                    disabled={this.state.gameState !== 'ENDGAME'}
                    onClick={this.startGame}
                >
                    Następna runda
                </Button>
            </StyledContainer>
        );
    }
}
export { GameRoom };