import { RemoteData } from './remote-data';
import { getRemoteDataM, RemoteDataM1 } from './remote-data-t';
import { Observable } from 'rxjs';
import * as R from 'fp-ts-rxjs/lib/Observable';
import { Monad2 } from 'fp-ts/lib/Monad';
import { Bifunctor2 } from 'fp-ts/lib/Bifunctor';
import { Alt2 } from 'fp-ts/lib/Alt';
import { MonadObservable2 } from 'fp-ts-rxjs/lib/MonadObservable';
import { Task } from 'fp-ts/lib/Task';
import { IO } from 'fp-ts/lib/IO';
import { pipeable } from 'fp-ts/lib/pipeable';
import { Option } from 'fp-ts/lib/Option';
import { MonadThrow2 } from 'fp-ts/lib/MonadThrow'

export const URI = 'ObservableRemoteData';
export type URI = typeof URI;

const T = getRemoteDataM(R.observable);

declare module 'fp-ts/lib/HKT' {
	interface URItoKind2<E, A> {
		ObservableRemoteData: ObservableRemoteData<E, A>;
	}
}

export type ObservableRemoteData<E, A> = Observable<RemoteData<E, A>>;

export const fromObservable: <A>(ma: Observable<A>) => ObservableRemoteData<never, A> = T.fromM;
export const fromTask = <A>(ma: Task<A>): ObservableRemoteData<never, A> => fromObservable(R.fromTask(ma));
export const fromIO = <E, A>(ma: IO<A>): ObservableRemoteData<E, A> => fromObservable(R.fromIO(ma));
export const fromOption = <E, A>(ma: Option<A>, error: () => E): ObservableRemoteData<E, A> => T.fromOption(ma, error);

export const observableRemoteData: RemoteDataM1<'Observable'> &
	Monad2<URI> &
	Bifunctor2<URI> &
	Alt2<URI> &
	MonadThrow2<URI> &
	MonadObservable2<URI> = {
	URI,
	...T,
	fromObservable,
	fromTask,
	fromIO,
	throwError: T.failure
};

const { alt, ap, apFirst, apSecond, bimap, chain, chainFirst, flatten, map, mapLeft } = pipeable(observableRemoteData);

export { alt, ap, apFirst, apSecond, bimap, chain, chainFirst, flatten, map, mapLeft };
